import type { CustomExamProfile, Mock, SectionResult } from '../../data/types';

export type MetricsFilters = {
  mode: 'Full' | 'Sectional'; subject: string; provider: string;
  from: string; to: string; limit: number;
};
export function sectionResult(mock: Mock, subject: string): SectionResult | undefined {
  if (mock.subject === 'Full Mock') return mock.sections?.find(section => section.subject === subject);
  return mock.subject === subject ? { ...mock, timeMinutes: mock.sectionTimeMinutes ?? mock.timeMinutes } : undefined;
}
const positiveTime = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
export function metricRecords(mocks: Mock[], filters: MetricsFilters, profile?: CustomExamProfile): Mock[] {
  if (filters.from && filters.to && filters.from > filters.to) return [];
  const filtered = mocks.filter(mock =>
    (filters.provider === 'All' || (mock.provider?.trim() || 'Unspecified') === filters.provider) &&
    (!filters.from || mock.date >= filters.from) && (!filters.to || mock.date <= filters.to));
  const records = filtered.flatMap((mock): Mock[] => {
    if (filters.mode === 'Full') {
      if (mock.subject !== 'Full Mock') return [];
      if (!mock.sections?.length) return [mock];
      const scored = mock.sections.filter(section => (profile?.sections.find(rule => rule.name === section.subject)?.sectionType ?? section.sectionType) !== 'qualifying');
      const times = scored.map(section => positiveTime(section.timeMinutes));
      return [{ ...mock,
        correct: scored.reduce((sum, section) => sum + section.correct, 0),
        incorrect: scored.reduce((sum, section) => sum + section.incorrect, 0),
        unattempted: scored.reduce((sum, section) => sum + section.unattempted, 0),
        timeMinutes: times.length && times.every(time => time !== undefined) ? times.reduce<number>((sum, time) => sum + time!, 0) : positiveTime(mock.timeMinutes),
      }];
    }
    const section = sectionResult(mock, filters.subject);
    if (!section) return [];
    const time = positiveTime(section.timeMinutes);
    return [{ ...mock, ...section, subject: filters.subject, sections: undefined,
      timeMinutes: time, sectionTimeMinutes: time,
      // A full mock's percentile is not a percentile for an extracted subject.
      percentile: mock.subject === 'Full Mock' ? undefined : mock.percentile,
    }];
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0));
  return filters.limit > 0 ? records.slice(-filters.limit) : records;
}
export function summarizeMetrics(records: Mock[]) {
  const scored = records.filter(mock => Number.isFinite(mock.score) && mock.maxScore > 0);
  const correct = records.reduce((sum, mock) => sum + mock.correct, 0);
  const attempted = records.reduce((sum, mock) => sum + mock.correct + mock.incorrect, 0);
  const questions = records.reduce((sum, mock) => sum + mock.correct + mock.incorrect + mock.unattempted, 0);
  const timed = records.filter(mock => positiveTime(mock.timeMinutes) !== undefined);
  const minutes = timed.reduce((sum, mock) => sum + mock.timeMinutes!, 0);
  return {
    count: records.length,
    scoreRate: scored.length ? scored.reduce((sum, mock) => sum + mock.score / mock.maxScore * 100, 0) / scored.length : null,
    averageMarks: scored.length ? scored.reduce((sum, mock) => sum + mock.score, 0) / scored.length : null,
    averageMaximum: scored.length ? scored.reduce((sum, mock) => sum + mock.maxScore, 0) / scored.length : null,
    averageAttempts: records.length ? attempted / records.length : null,
    averageQuestions: records.length ? questions / records.length : null,
    accuracy: attempted > 0 ? correct / attempted * 100 : null,
    attemptRate: questions > 0 ? attempted / questions * 100 : null,
    speed: minutes > 0 ? timed.reduce((sum, mock) => sum + mock.correct + mock.incorrect, 0) / minutes : null,
    timedCount: timed.length,
    latest: records.at(-1),
  };
}

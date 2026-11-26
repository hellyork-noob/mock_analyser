import type { Mock } from '../../data/db';
export type HistorySort = 'newest' | 'oldest' | 'score-high' | 'score-low';
export type HistoryFilters = {
    historySearch: string;
    historySubject: string;
    historyProvider: string;
    historySort: HistorySort;
};
export function selectHistoryRows(mocks: Mock[], exam: string, { historySearch, historySubject, historyProvider, historySort }: HistoryFilters): Mock[] {
    return mocks
        .filter((m) => m.exam === exam &&
        (historySubject === "All" ||
            (historySubject === "Full Mock"
                ? m.subject === "Full Mock"
                : m.subject === historySubject ||
                    !!m.sections?.some((x) => x.subject === historySubject))) &&
        (historyProvider === "All" ||
            (m.provider?.trim() || "Unspecified") === historyProvider) &&
        (m.title +
            " " +
            (m.provider ?? "") +
            " " +
            (m.mockName ?? "") +
            " " +
            m.exam +
            " " +
            m.subject)
            .toLowerCase()
            .includes(historySearch.toLowerCase()))
        .sort((a, b) => {
        if (historySort === "score-high" || historySort === "score-low") {
            const diff = (a.maxScore ? (100 * a.score) / a.maxScore : 0) -
                (b.maxScore ? (100 * b.score) / b.maxScore : 0);
            return historySort === "score-high" ? -diff : diff;
        }
        const diff = a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0);
        return historySort === "newest" ? -diff : diff;
    });
}
export function selectHistoryProviders(mocks: Mock[], exam: string): string[] {
    return [...new Set(mocks.filter(m => m.exam === exam).map(m => m.provider?.trim() || 'Unspecified'))].sort();
}

export const backupCategories = {
  mocks: { label: 'Mock history', keys: ['mocks'] },
  profiles: { label: 'Exam profiles and targets', keys: ['customExamProfiles'] },
  countdowns: { label: 'Exam countdowns', keys: ['exams'] },
  playlists: { label: 'Study playlists', keys: ['playlists'] },
  study: { label: 'Study tasks, goals, and focus log', keys: ['studyTasks', 'studyGoals', 'focusSessions'] },
  appearance: { label: 'Appearance and saved themes', keys: ['appearance'] },
} as const;

export type BackupCategory = keyof typeof backupCategories;
export const allBackupCategories = Object.keys(backupCategories) as BackupCategory[];

export function parseBackup(value: unknown) {
  if (!value || typeof value !== 'object' || !('app' in value) || value.app !== 'Advance Analyzer v2') {
    throw new Error('Choose an Advance Analyzer v2 backup.');
  }
  const data = value as Record<string, unknown>;
  const categories = allBackupCategories.filter(category => backupCategories[category].keys.some(key => Object.hasOwn(data, key)));
  if (!categories.length) throw new Error('This backup contains no supported data.');
  return { data, categories };
}

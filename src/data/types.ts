export type SectionResult = {
    subject: string;
    correct: number;
    incorrect: number;
    unattempted: number;
    score: number;
    maxScore: number;
    sectionType?: 'main' | 'qualifying';
    timeMinutes?: number;
};
export type Mock = {
    sections?: SectionResult[];
    id?: number;
    exam: string;
    title: string;
    date: string;
    score: number;
    maxScore: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    subject: string;
    url?: string;
    timeMinutes?: number;
    sectionTimeMinutes?: number;
    provider?: string;
    mockName?: string;
    percentile?: number;
};
export type ExamSectionConfig = {
    name: string;
    questions: number;
    positive: number;
    negative: number;
    maxMarks: number;
    sectionType?: 'main' | 'qualifying';
    qualifyingThreshold?: number;
};
export type CustomExamProfile = {
    id?: number;
    name: string;
    tier: string;
    key: string;
    durationMinutes: number;
    targetScore?: number;
    subjectTargets?: Record<string, number>;
    sections: ExamSectionConfig[];
    createdAt: string;
};
export type Exam = {
    id?: number;
    name: string;
    date?: string;
    appliedAndPaid?: boolean;
};
export type PlaylistVideo = {
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    completed: boolean;
};
export type Playlist = {
    id?: number;
    title: string;
    url: string;
    completed: boolean;
    videos?: PlaylistVideo[];
};

export type StudyTask = {
    id?: number;
    date: string;
    title: string;
    estimatedMinutes: number;
    priority: 'high' | 'normal' | 'low';
    completed: boolean;
    createdAt: number;
    scheduledTime?: string;
    reminderMinutes?: number;
    reminderDismissed?: boolean;
    reminderNotified?: boolean;
};
export type StudyGoal = { date: string; targetMinutes: number };
export type FocusSegment = { start: number; end: number };
export type FocusSession = {
    id?: number;
    token: string;
    title: string;
    taskId?: number;
    estimatedForDate?: string;
    startedAt: number;
    endedAt: number;
    seconds: number;
    segments: FocusSegment[];
    completed: boolean;
};
export type FocusTimer = {
    id: 'active';
    token: string;
    title: string;
    taskId?: number;
    startedAt: number;
    runningSince: number | null;
    segments: FocusSegment[];
} & (
    { mode: 'focus' | 'break'; durationSeconds: number; stoppedAt?: never } |
    { mode: 'stopwatch'; durationSeconds: null; stoppedAt?: number }
);

import type { SectionResult, Mock, ExamSectionConfig, CustomExamProfile, Exam, PlaylistVideo, Playlist } from "./types";
export type { SectionResult, Mock, ExamSectionConfig, CustomExamProfile, Exam, PlaylistVideo, Playlist } from "./types";
import Dexie, { type Table } from 'dexie';
import { normalizeAppearance } from '../app/appearance';
import { normalizePresets, useAppearance } from '../app/appearanceStore';
import { useUI } from '../app/uiStore';
import { allBackupCategories, backupCategories, parseBackup, type BackupCategory } from './backupCategories';
import type { StudyTask, StudyGoal, FocusSession, FocusTimer } from './types';
class AnalyzerDB extends Dexie {
    mocks!: Table<Mock, number>;
    exams!: Table<Exam, number>;
    playlists!: Table<Playlist, number>;
    customExamProfiles!: Table<CustomExamProfile, number>;
    studyTasks!: Table<StudyTask, number>;
    studyGoals!: Table<StudyGoal, string>;
    focusSessions!: Table<FocusSession, number>;
    focusTimers!: Table<FocusTimer, string>;
    constructor() {
        super('advance_analyzer_v2_clean_phase5a');
        this.version(1).stores({ mocks: '++id,exam,date,subject', exams: '++id,date', playlists: '++id' });
        this.version(2).stores({ mocks: '++id,exam,date,subject', exams: '++id,date', playlists: '++id', customExamProfiles: '++id,&key' });
        this.version(3).stores({ studyTasks: '++id,date', studyGoals: 'date', focusSessions: '++id,&token,startedAt', focusTimers: 'id' });
    }
}
export const db = new AnalyzerDB();
export async function readBackupRecords() {
    return db.transaction('r', [db.mocks, db.exams, db.playlists, db.customExamProfiles, db.studyTasks, db.studyGoals, db.focusSessions], async () => {
        const [mocks, exams, playlists, customExamProfiles, studyTasks, studyGoals, focusSessions] = await Promise.all([
            db.mocks.toArray(), db.exams.toArray(), db.playlists.toArray(), db.customExamProfiles.toArray(),
            db.studyTasks.toArray(), db.studyGoals.toArray(), db.focusSessions.toArray(),
        ]);
        return { mocks, exams, playlists, customExamProfiles, studyTasks, studyGoals, focusSessions };
    });
}
export function readAppearanceBackup() {
    const { preferences, presets } = useAppearance.getState();
    return { preferences, presets, theme: useUI.getState().theme };
}

export async function exportBackup(selection: BackupCategory[] = allBackupCategories) {
    if (!selection.length) throw new Error('Select at least one category to export.');
    const records = { ...await readBackupRecords(), appearance: readAppearanceBackup() };
    const keys = selection.flatMap(category => [...backupCategories[category].keys]);
    const payload = {
        app: 'Advance Analyzer v2', schema: 4, exportedAt: new Date().toISOString(),
        ...Object.fromEntries(keys.map(key => [key, records[key]])),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'advance-analyzer-backup.json';
    document.body.append(link);
    try { link.click(); }
    finally {
        link.remove();
        // Give browsers time to start reading the download.
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
}

export async function importBackup(value: unknown, selection?: BackupCategory[]): Promise<void> {
    const { data, categories } = parseBackup(value);
    const selected = new Set(selection ?? categories);
    if (!selected.size) throw new Error('Select at least one category to restore.');
    if ([...selected].some(category => !categories.includes(category))) throw new Error('A selected category is missing from this backup.');

    function records<T>(key: string, valid: (record: T) => boolean): T[] {
        const rows = data[key];
        if (!Array.isArray(rows) || rows.some(record => !record || !valid(record))) {
            throw new Error('Invalid or missing backup records for ' + key);
        }
        return rows as T[];
    }

    const mocks = selected.has('mocks') ? records<Mock>('mocks', m => typeof m.exam === 'string' && typeof m.title === 'string' &&
        typeof m.date === 'string' && typeof m.subject === 'string' && Number.isFinite(m.score) && Number.isFinite(m.maxScore)) : undefined;
    const profiles = selected.has('profiles') ? records<CustomExamProfile>('customExamProfiles', p => typeof p.key === 'string' && Array.isArray(p.sections)) : undefined;
    const exams = selected.has('countdowns') ? records<Exam>('exams', e => typeof e.name === 'string' &&
        (e.date === undefined || typeof e.date === 'string') && (e.appliedAndPaid === undefined || typeof e.appliedAndPaid === 'boolean')) : undefined;
    const playlists = selected.has('playlists') ? records<Playlist>('playlists', p => typeof p.title === 'string' && typeof p.url === 'string') : undefined;
    const study = selected.has('study');
    if (study) validateStudyBackup(data);
    const appearance = selected.has('appearance') ? validateAppearanceBackup(data.appearance) : undefined;

    async function replace<T, K>(table: Table<T, K>, rows: T[]) {
        await table.clear();
        await table.bulkAdd(rows);
    }

    if (mocks || profiles || exams || playlists || study) {
        await db.transaction('rw', [db.mocks, db.exams, db.playlists, db.customExamProfiles, db.studyTasks, db.studyGoals, db.focusSessions, db.focusTimers], async () => {
            if (study && await db.focusTimers.get('active')) {
                throw new Error('Finish or discard the active timer before restoring study data.');
            }
            if (mocks) await replace(db.mocks, mocks);
            if (profiles) await replace(db.customExamProfiles, profiles);
            if (exams) await replace(db.exams, exams);
            if (playlists) await replace(db.playlists, playlists);
            if (study) {
                await replace(db.studyTasks, data.studyTasks as StudyTask[]);
                await replace(db.studyGoals, data.studyGoals as StudyGoal[]);
                await replace(db.focusSessions, data.focusSessions as FocusSession[]);
            }
        });
    }

    if (appearance) {
        try {
            useAppearance.getState().restore(appearance.preferences, appearance.presets);
            useUI.getState().setTheme(appearance.theme);
        } catch {
            throw new Error('The browser could not save the restored appearance. Any selected records were restored.');
        }
    }
}

function validateAppearanceBackup(value: unknown) {
    const appearance = value as Partial<ReturnType<typeof readAppearanceBackup>> | null | undefined;
    if (!appearance || !appearance.preferences || typeof appearance.preferences !== 'object' ||
        !Array.isArray(appearance.presets) || (appearance.theme !== 'dark' && appearance.theme !== 'light' && appearance.theme !== 'system')) {
        throw new Error('Invalid appearance backup.');
    }
    return {
        preferences: normalizeAppearance(appearance.preferences),
        presets: normalizePresets(appearance.presets),
        theme: appearance.theme,
    };
}

function validateStudyBackup(data: Record<string, unknown>) {
    for (const key of ['studyTasks', 'studyGoals', 'focusSessions']) {
        if (!Array.isArray(data[key])) throw new Error('Backup is missing ' + key);
    }
    const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
    if ((data.studyTasks as StudyTask[]).some(task => !task || !isDate(task.date) || typeof task.title !== 'string' ||
        !Number.isFinite(task.estimatedMinutes) || task.estimatedMinutes < 0 || typeof task.completed !== 'boolean' ||
        (task.scheduledTime !== undefined && (typeof task.scheduledTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.scheduledTime))) ||
        (task.reminderMinutes !== undefined && (!task.scheduledTime || !Number.isInteger(task.reminderMinutes) || task.reminderMinutes < 0 || task.reminderMinutes > 1440)) ||
        !['high', 'normal', 'low'].includes(task.priority) || !Number.isFinite(task.createdAt))) throw new Error('Invalid study tasks');
    if ((data.studyGoals as StudyGoal[]).some(goal => !goal || !isDate(goal.date) || !Number.isFinite(goal.targetMinutes) || goal.targetMinutes < 1 || goal.targetMinutes > 1440)) throw new Error('Invalid study goals');
    if ((data.focusSessions as FocusSession[]).some(session => !session || typeof session.token !== 'string' || typeof session.title !== 'string' ||
        (session.estimatedForDate !== undefined && !isDate(session.estimatedForDate)) ||
        !Number.isFinite(session.seconds) || session.seconds < 0 || !Number.isFinite(session.startedAt) || !Number.isFinite(session.endedAt) ||
        session.endedAt < session.startedAt || typeof session.completed !== 'boolean' || !Array.isArray(session.segments) ||
        session.segments.some(segment => !segment || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.end < segment.start))) throw new Error('Invalid focus sessions');
}

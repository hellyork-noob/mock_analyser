import { useAutomaticBackup } from "./useAutomaticBackup";
import { useCallback, useEffect, useState } from "react";
import { db, type Mock, type Exam, type Playlist, type CustomExamProfile } from "../data/db";
import type { StudyTask, StudyGoal, FocusSession } from '../data/types';
export function useWorkspaceData() {
    const [mocks, setMocks] = useState<Mock[]>([]), [exams, setExams] = useState<Exam[]>([]), [playlists, setPlaylists] = useState<Playlist[]>([]), [customProfiles, setCustomProfiles] = useState<CustomExamProfile[]>([]), [refresh, setRefresh] = useState(0), [dbError, setDbError] = useState(""), [dbReady, setDbReady] = useState(false);
    const [tasks, setTasks] = useState<StudyTask[]>([]);
    const [goals, setGoals] = useState<StudyGoal[]>([]);
    const [sessions, setSessions] = useState<FocusSession[]>([]);
    const reload = useCallback(() => setRefresh((x) => x + 1), []);
    useAutomaticBackup(dbReady, refresh);
    useEffect(() => {
        let active = true;
        setDbReady(false);
        Promise.all([
            db.mocks.toArray(),
            db.exams.toArray(),
            db.playlists.toArray(),
            db.customExamProfiles.toArray(),
            db.studyTasks.toArray(), db.studyGoals.toArray(), db.focusSessions.toArray(),
        ])
            .then(([m, e, p, c, t, g, f]) => {
            if (!active)
                return;
            setMocks(m);
            setExams(e);
            setPlaylists(p);
            setCustomProfiles(c);
            setTasks(t); setGoals(g); setSessions(f);
            setDbError("");
            setDbReady(true);
        })
            .catch((error) => {
            console.error("Advance Analyzer: database read failed", error);
            if (active) {
                setDbError(error instanceof Error ? error.message : String(error));
                setDbReady(false);
            }
        });
        return () => {
            active = false;
        };
    }, [refresh]);
    return { mocks, exams, playlists, customProfiles, tasks, goals, sessions, reload, dbReady, dbError };
}

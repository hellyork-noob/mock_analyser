import { create } from "zustand";
import type { ThemeMode } from "./appearance";
export type SettingsSection = 'appearance' | 'exams' | 'backups' | 'connections';
import { views, type View } from "./navigation";
export const useUI = create<{
    view: View;
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    compact: boolean;
    settingsSection: SettingsSection;
    setSettingsSection: (section: SettingsSection) => void;
    exam: string;
    setExam: (v: string) => void;
    setView: (v: View) => void;
    toggleTheme: () => void;
    toggleCompact: () => void;
}>((set) => ({
    view: views.find((v) => v === localStorage.getItem("aa_v2_clean_view")) ??
        "Analytics",
    theme: (["dark", "light", "system"].includes(localStorage.getItem("aa_v2_clean_theme") || "") ? localStorage.getItem("aa_v2_clean_theme") : "dark") as ThemeMode,
    setTheme: theme => { localStorage.setItem("aa_v2_clean_theme", theme); set({ theme }); },
    compact: localStorage.getItem("aa_v2_clean_compact") === "true",
    settingsSection: 'appearance',
    setSettingsSection: settingsSection => set({ settingsSection }),
    exam: localStorage.getItem("aa_v2_clean_exam") || "",
    setExam: (exam) => {
        localStorage.setItem("aa_v2_clean_exam", exam);
        set({ exam });
    },
    setView: (view) => {
        localStorage.setItem("aa_v2_clean_view", view);
        set({ view });
    },
    toggleTheme: () => set((s) => {
        const current = s.theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : s.theme;
        const theme = current === "dark" ? "light" : "dark";
        localStorage.setItem("aa_v2_clean_theme", theme);
        return { theme };
    }),
    toggleCompact: () => set((s) => {
        const compact = !s.compact;
        localStorage.setItem("aa_v2_clean_compact", String(compact));
        return { compact };
    }),
}));

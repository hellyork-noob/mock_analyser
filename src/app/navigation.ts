import { LayoutDashboard, PlusCircle, History, CalendarDays, ListVideo, Settings, NotebookPen } from "lucide-react";
export type View = "Analytics" | "Add Mock" | "Mock History" | "Exam Countdown" | "Study Playlist" | "Study Planner" | "Settings";
export const navigationItems = [
    { view: 'Analytics', icon: LayoutDashboard, group: 'daily' },
    { view: 'Study Planner', icon: NotebookPen, group: 'daily' },
    { view: 'Add Mock', icon: PlusCircle, group: 'mocks' },
    { view: 'Mock History', icon: History, group: 'mocks' },
    { view: 'Exam Countdown', icon: CalendarDays, group: 'tools' },
    { view: 'Study Playlist', icon: ListVideo, group: 'tools' },
    { view: 'Settings', icon: Settings, group: 'workspace' },
] satisfies Array<{ view: View; icon: typeof LayoutDashboard; group: string }>;
export const views: View[] = navigationItems.map(item => item.view);

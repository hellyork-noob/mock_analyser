import { ListPlus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useUI } from "./uiStore";
import { navigationItems } from "./navigation";
import WorkspaceControls from "./WorkspaceControls";
import { quickTaskShortcut } from "../features/study/QuickTaskDialog";

export default function Sidebar({ availableExams, quickTaskEnabled, onQuickTask }: {
    availableExams: string[]; quickTaskEnabled: boolean; onQuickTask: () => void;
}) {
    const { view, compact, setView, toggleCompact } = useUI();
    return (<aside className="sidebar">
        <nav aria-label="Main navigation">
          {navigationItems.map(({ view: v, icon: Icon, group }, i) => {
            return (<button key={v} type="button" data-group-start={i > 0 && navigationItems[i - 1].group !== group ? "true" : undefined} title={v} className={view === v ? "active" : ""} aria-current={view === v ? "page" : undefined} onClick={() => setView(v)}>
                <Icon size={18}/>
                {!compact && <span>{v}</span>}
              </button>);
        })}
        </nav>
        <button className="sidebar-quick-task" type="button" aria-keyshortcuts={quickTaskShortcut}
          aria-label="Quick add task" title={`Quick add task (${quickTaskShortcut})`} disabled={!quickTaskEnabled} onClick={onQuickTask}>
          <ListPlus size={18} aria-hidden="true"/><span>Quick add task</span>
        </button>
        <div className="sidefoot">
          <WorkspaceControls availableExams={availableExams}/>
          <button className="sidebar-collapse" type="button" title={compact ? "Expand sidebar" : "Collapse sidebar"} aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleCompact}>
            {compact ? (<PanelLeftOpen size={19}/>) : (<PanelLeftClose size={19}/>)}{" "}
            {!compact && "Collapse sidebar"}
          </button>
        </div>
      </aside>);
}

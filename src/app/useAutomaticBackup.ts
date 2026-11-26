import { useEffect } from "react";
import { captureSnapshot } from "../data/autoBackup";
// Save after loading or changing records, rather than serializing the whole
// workspace on a timer while the user is scrolling through unchanged data.
export function useAutomaticBackup(ready: boolean, revision: number) {
    useEffect(() => {
        if (!ready)
            return;
        const save = () => void captureSnapshot().catch(error => console.error("Automatic backup failed", error));
        let idle: number | undefined;
        const timer = window.setTimeout(() => {
            if ("requestIdleCallback" in window) {
                idle = window.requestIdleCallback(save, { timeout: 5000 });
            }
            else {
                save();
            }
        }, 1000);
        const onHidden = () => { if (document.hidden)
            save(); };
        document.addEventListener("visibilitychange", onHidden);
        return () => {
            window.clearTimeout(timer);
            if (idle !== undefined)
                window.cancelIdleCallback(idle);
            document.removeEventListener("visibilitychange", onHidden);
        };
    }, [ready, revision]);
}

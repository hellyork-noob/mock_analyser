import { captureSnapshot, listSnapshots, getSnapshot, downloadSnapshot, requestPersistentStorage, isStoragePersistent } from "../../data/autoBackup";
import { useEffect, useState } from "react";
export default function AutoBackupPanel({ onPreview, disabled }: {
    onPreview: (payload: unknown) => void;
    disabled: boolean;
}) {
    const [snapshots, setSnapshots] = useState<Array<{
        id: number;
        createdAt: string;
        total: number;
    }>>([]);
    const [message, setMessage] = useState("");
    const [persistent, setPersistent] = useState<boolean | null>(null);
    const refreshList = async () => {
        try {
            setSnapshots(await listSnapshots());
            setPersistent(await isStoragePersistent());
            setMessage("");
        }
        catch (e) {
            setMessage("Backup vault error: " + String(e));
        }
    };
    useEffect(() => {
        void refreshList();
        const timer = setInterval(() => void refreshList(), 30000);
        return () => clearInterval(timer);
    }, []);
    const create = async () => {
        try {
            const saved = await captureSnapshot();
            await refreshList();
            setMessage(saved
                ? "Snapshot saved."
                : "No changes to save (or workspace is empty).");
        }
        catch (e) {
            setMessage("Backup failed: " + String(e));
        }
    };
    const restore = async (id: number) => {
        try {
            onPreview((await getSnapshot(id)).payload);
            document.getElementById('backup-restore-options')?.focus();
        }
        catch (e) {
            setMessage("Restore failed: " + String(e));
        }
    };
    return (<div className="settingrow" style={{ display: "block" }}>
      <h3>Automatic backup protection</h3>
      <p>
        Changed data is copied to a separate browser backup vault after saved
        changes, when the browser is idle. Up to 15 versions are retained. Empty data never
        replaces a saved snapshot.
      </p>
      <p>
        <strong>Browser storage:</strong>{" "}
        {persistent === null
            ? "Checking…"
            : persistent
                ? "Persistent storage granted"
                : "Best-effort storage (can be cleared by Chrome)"}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button className="secondary" onClick={create}>
          Save snapshot now
        </button>
        <button className="secondary" onClick={() => void refreshList()}>
          Refresh backups
        </button>
        <button className="secondary" onClick={async () => {
            try {
                const ok = await requestPersistentStorage();
                setPersistent(ok);
                setMessage(ok
                    ? "Persistent storage granted."
                    : "Chrome did not grant persistent storage. Keep external JSON backups.");
            }
            catch (e) {
                setMessage(String(e));
            }
        }}>
          Request persistent storage
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {snapshots.length === 0 ? (<p>
          No automatic snapshots yet. Save an exam or mock, then choose Save
          snapshot now.
        </p>) : (<div style={{ maxHeight: 260, overflowY: "auto" }}>
          {snapshots.map((s) => (<div key={s.id} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                    padding: "8px 0",
                    borderBottom: "1px solid #7774",
                }}>
              <span>
                {new Date(s.createdAt).toLocaleString()} · {s.total} records
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <button className="secondary" onClick={() => void downloadSnapshot(s.id).catch((e) => setMessage(String(e)))}>
                  Download JSON
                </button>
                <button className="secondary" disabled={disabled} onClick={() => void restore(s.id)}>
                  Review restore
                </button>
              </span>
            </div>))}
        </div>)}
      <p style={{ fontSize: 12, opacity: 0.8, marginTop: 10 }}>
        Important: Browser snapshots share the same Chrome origin. Clearing site
        data or using another browser profile can erase both databases. Download
        JSON backups regularly and store copies outside Chrome.
      </p>
    </div>);
}

import { useState } from 'react';
import { db } from '../../data/db';

export default function StorageDiagnostics() {
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      const counts = await Promise.all([db.mocks.count(), db.customExamProfiles.count(), db.exams.count(), db.playlists.count(), db.studyTasks.count(), db.studyGoals.count(), db.focusSessions.count()]);
      const storage = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      setReport(`Mocks: ${counts[0]} · Exam profiles: ${counts[1]} · Countdowns: ${counts[2]} · Playlists: ${counts[3]}\nTasks: ${counts[4]} · Daily goals: ${counts[5]} · Focus sessions: ${counts[6]}\nPersistent storage: ${persisted === undefined ? 'Unavailable' : persisted ? 'Granted' : 'Not granted'}\nEstimated space used: ${storage?.usage === undefined ? 'Unavailable' : `${(storage.usage / 1024 / 1024).toFixed(2)} MB`}`);
    } catch (error) { setReport(`Storage check failed: ${String(error)}`); }
    finally { setBusy(false); }
  }
  return <details className="settings-storage-details"><summary>Storage diagnostics</summary>
    <p>Check saved records and browser storage when troubleshooting missing data.</p>
    <button className="secondary" type="button" disabled={busy} onClick={() => void check()}>{busy ? 'Checking…' : 'Check storage'}</button>
    {report && <p className="settings-storage-result" role="status">{report}</p>}
    <small className="muted">Site: {location.origin}<br/>Database: {db.name}</small>
  </details>;
}

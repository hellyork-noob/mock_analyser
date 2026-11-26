import { useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { exportBackup, importBackup } from '../../data/db';
import { allBackupCategories, backupCategories, parseBackup, type BackupCategory } from '../../data/backupCategories';
import AutoBackupPanel from './AutoBackupPanel';
import StorageDiagnostics from './StorageDiagnostics';

function BackupChoices({ categories, selected, onChange, disabled, label, data }: {
  categories: BackupCategory[];
  selected: BackupCategory[];
  onChange: (categories: BackupCategory[]) => void;
  disabled: boolean;
  label: string;
  data?: Record<string, unknown>;
}) {
  return <fieldset className="backup-choices" disabled={disabled}>
    <legend>{label}</legend>
    {categories.map(category => {
      const { label, keys } = backupCategories[category];
      const count = data && category !== 'appearance' ? keys.reduce((total, key) => {
        const rows = data[key];
        return total + (Array.isArray(rows) ? rows.length : 0);
      }, 0) : null;
      return <label key={category}>
        <input type="checkbox" checked={selected.includes(category)} onChange={event => onChange(event.target.checked
          ? [...selected, category]
          : selected.filter(item => item !== category))}/>
        <span>{label}{count !== null && <small> ({count})</small>}</span>
      </label>;
    })}
  </fieldset>;
}

export default function BackupSettings({ onRestored }: { onRestored: () => void }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [exportSelection, setExportSelection] = useState(allBackupCategories);
  const [preview, setPreview] = useState<ReturnType<typeof parseBackup> | null>(null);
  const [restoreSelection, setRestoreSelection] = useState<BackupCategory[]>([]);

  function previewBackup(value: unknown) {
    const parsed = parseBackup(value);
    setPreview(parsed);
    setRestoreSelection(parsed.categories);
    setMessage('');
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPreview(null);
    setBusy(true);
    try {
      previewBackup(JSON.parse(await file.text()));
    } catch (error) {
      setMessage(`Could not read backup: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!preview || !restoreSelection.length) return;
    const selectedNames = restoreSelection.map(category => backupCategories[category].label).join(', ');
    if (!confirm(`Replace current data in these categories?\n\n${selectedNames}\n\nEmpty selected categories also replace current records. Other categories are kept.`)) return;
    setBusy(true);
    try {
      await importBackup(preview.data, restoreSelection);
      setPreview(null);
      const mocks = preview.data.mocks;
      const mockSummary = restoreSelection.includes('mocks') && Array.isArray(mocks)
        ? ` ${mocks.length} mock record${mocks.length === 1 ? '' : 's'} restored. Use the Selected exam menu to switch between exams.`
        : '';
      setMessage('Backup restored.' + mockSummary);
    } catch (error) {
      setMessage(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      onRestored();
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    try {
      await exportBackup(exportSelection);
      setMessage('Backup download started.');
    } catch (error) {
      setMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return <div className="settings-backups">
    <div className="settings-section-heading"><h3>Backups &amp; storage</h3><p>Download a portable copy, restore saved records, or recover an automatic snapshot.</p></div>
    <div className="settings-backup-actions">
      <article>
        <Download size={21}/><h4>Download your data</h4>
        <BackupChoices categories={allBackupCategories} selected={exportSelection} onChange={setExportSelection} disabled={busy} label="Include in export"/>
        <button className="primary" disabled={busy || !exportSelection.length} type="button" onClick={() => void download()}><Download size={15}/> Export JSON</button>
      </article>
      <article id="backup-restore-options" tabIndex={-1}>
        <Upload size={21}/><h4>Restore a backup</h4><p>Choose a file, then select the categories you want to replace.</p>
        <label className="secondary settings-file-button"><Upload size={15}/> Choose backup JSON
          <input aria-label="Restore backup JSON" disabled={busy} type="file" accept=".json,application/json" onChange={event => void chooseFile(event)}/>
        </label>
        {preview && <>
          <BackupChoices categories={preview.categories} selected={restoreSelection} onChange={setRestoreSelection}
            disabled={busy} label="Categories in this backup" data={preview.data}/>
          <button className="primary" disabled={busy || !restoreSelection.length} type="button" onClick={() => void restore()}>Restore selected</button>
        </>}
      </article>
    </div>
    {message && <p className="settings-feedback" role="status">{message}</p>}
    <AutoBackupPanel onPreview={previewBackup} disabled={busy}/>
    <StorageDiagnostics/>
  </div>;
}

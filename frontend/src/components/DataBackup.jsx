import React, { useRef } from 'react';
import { Database, Download, Upload, RotateCcw } from 'lucide-react';

export function DataBackup({ fullState, onImport, onReset, onNotify }) {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    try {
      const jsonString = JSON.stringify(fullState, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `creative-hub-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify('Backup JSON downloaded successfully!', 'success');
    } catch (err) {
      onNotify('Failed to export data backup.', 'error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        onImport(parsed);
        onNotify('Backup data imported successfully!', 'success');
      } catch (err) {
        onNotify('Invalid JSON file format.', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Reset dashboard to default demo data? All current subscriptions and token logs will be replaced.'
      )
    ) {
      onReset();
      onNotify('Demo dataset restored.', 'info');
    }
  };

  return (
    <section className="card" id="reports">
      <div className="card-header">
        <div>
          <h2>
            <Database size={20} color="#6366f1" />
            Data Backup & Migration
          </h2>
          <p>Export full snapshots, restore previous JSON backups, or reset demo records.</p>
        </div>
      </div>

      <div className="backup-controls">
        <button
          type="button"
          className="btn btn-soft"
          onClick={handleExport}
        >
          <Download size={16} /> Export JSON Backup
        </button>

        <button
          type="button"
          className="btn btn-soft"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} /> Import JSON File
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden-file-input"
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="btn btn-danger"
          onClick={handleReset}
        >
          <RotateCcw size={16} /> Reset Demo Data
        </button>
      </div>
    </section>
  );
}

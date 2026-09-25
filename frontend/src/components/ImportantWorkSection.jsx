import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Loader2, Pencil, Save, Trash2, X } from 'lucide-react';
import { createImportantWork, deleteImportantWork, fetchImportantWork, updateImportantWork } from '../services/importantWorkService';
import './ImportantWorkSection.css';

const EMPTY_FORM = { title: '', designerName: '', supervisorName: '', process: 'Planned', dueDate: '' };
const PROCESSES = ['Planned', 'Designing', 'Review', 'Revision', 'Approved', 'Completed'];
const EDIT_ROLES = new Set(['super_admin', 'admin', 'head_brand']);

export function ImportantWorkSection({ user, onNotify }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = EDIT_ROLES.has(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchImportantWork()); setError(''); }
    catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setError(''); };

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editingId) await updateImportantWork(editingId, form);
      else await createImportantWork(form);
      onNotify?.(editingId ? 'Important work updated.' : 'Important work added.', 'success');
      resetForm(); await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  };

  const edit = (item) => {
    setEditingId(item._id);
    setForm({ title: item.title || '', designerName: item.designerName || '', supervisorName: item.supervisorName || '', process: item.process || 'Planned', dueDate: item.dueDate || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      await deleteImportantWork(item._id);
      if (editingId === item._id) resetForm();
      onNotify?.('Important work deleted.', 'success');
      await load();
    } catch (deleteError) { setError(deleteError.message); }
  };

  return <section className="important-work-page">
    <header className="important-work-header"><div><h2><BellRing size={22} /> Important Work</h2><p>Design work, responsibility, process and due date.</p></div><span>{items.length} work item{items.length === 1 ? '' : 's'}</span></header>
    {error && <div className="error-banner">{error}</div>}
    {canEdit && <form className="important-work-form" onSubmit={save}>
      <h3>{editingId ? 'Edit important work' : 'Add important work'}</h3>
      <label>Work Title<input required maxLength="160" value={form.title} onChange={(e) => setField('title', e.target.value)} /></label>
      <label>Designer<input required maxLength="120" value={form.designerName} onChange={(e) => setField('designerName', e.target.value)} /></label>
      <label>Supervising Designer<input required maxLength="120" value={form.supervisorName} onChange={(e) => setField('supervisorName', e.target.value)} /></label>
      <label>Process<select value={form.process} onChange={(e) => setField('process', e.target.value)}>{PROCESSES.map((process) => <option key={process}>{process}</option>)}</select></label>
      <label>Due Date<input required type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} /></label>
      <div className="work-form-actions">{editingId && <button type="button" className="btn btn-outline" onClick={resetForm}><X size={14} /> Cancel</button>}<button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {editingId ? 'Update' : 'Save'}</button></div>
    </form>}
    {loading ? <div className="loading-state"><Loader2 className="animate-spin" /> Loading important work…</div> : items.length === 0 ? <div className="empty-state">No important work has been added.</div> : <div className="important-work-list">
      <div className="important-work-list-head"><span>Work Title</span><span>Supervisor</span><span>Designer</span><span>Process</span><span>Due Date</span><span>Actions</span></div>
      {items.map((item) => <article className="important-work-row" key={item._id}>
        <strong data-label="Work Title">{item.title}</strong><span data-label="Supervisor">{item.supervisorName}</span><span data-label="Designer">{item.designerName}</span><span data-label="Process"><b className="process-badge">{item.process}</b></span><time data-label="Due Date" dateTime={item.dueDate}>{item.dueDate}</time>
        <div className="important-work-actions" data-label="Actions">{canEdit && <><button type="button" aria-label={`Edit ${item.title}`} onClick={() => edit(item)}><Pencil size={15} /></button><button type="button" className="danger" aria-label={`Delete ${item.title}`} onClick={() => remove(item)}><Trash2 size={15} /></button></>}</div>
      </article>)}
    </div>}
  </section>;
}

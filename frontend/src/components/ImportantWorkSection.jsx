import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, ExternalLink, FileSpreadsheet, FileText, Loader2, Plus, Presentation, Save } from 'lucide-react';
import { createImportantWork, fetchImportantWork, sendImportantWorkReminder, updateImportantWork } from '../services/importantWorkService';
import './ImportantWorkSection.css';

const emptyForm = { title: '', description: '', ownerName: '', reminderEmail: '', dueDate: '', reminderDaysBefore: 3, priority: 'High', status: 'Planned', links: [{ type: 'Google Slides', label: '', url: '' }] };
const editableRoles = new Set(['super_admin', 'admin', 'head_brand']);
const icons = { Excel: FileSpreadsheet, PDF: FileText, 'Google Slides': Presentation };

export function ImportantWorkSection({ user, onNotify }) {
  const [items, setItems] = useState([]); const [form, setForm] = useState(emptyForm); const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const canEdit = editableRoles.has(user?.role);
  const load = async () => { try { setLoading(true); setItems(await fetchImportantWork()); setError(''); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const activeItems = useMemo(() => items.filter((item) => !['Completed', 'Cancelled'].includes(item.status)), [items]);
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const setLink = (index, name, value) => setForm((current) => ({ ...current, links: current.links.map((link, i) => i === index ? { ...link, [name]: value } : link) }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { editingId ? await updateImportantWork(editingId, form) : await createImportantWork(form); onNotify?.('Important work reminder saved.', 'success'); setForm(emptyForm); setEditingId(null); await load(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const edit = (item) => { setEditingId(item._id); setForm({ ...emptyForm, ...item, links: item.links?.length ? item.links : emptyForm.links }); };
  const remind = async (item) => { try { await sendImportantWorkReminder(item._id); onNotify?.(`Reminder sent to ${item.reminderEmail}.`, 'success'); await load(); } catch (e) { setError(e.message); } };
  const dueLabel = (date) => { const days = Math.ceil((new Date(`${date}T23:59:59`) - new Date()) / 86400000); return days < 0 ? `${Math.abs(days)} day(s) overdue` : days === 0 ? 'Due today' : `Due in ${days} day(s)`; };

  return <section className="important-work-page">
    <div className="section-header"><div><h2><BellRing size={22} /> Important Work & Reminders</h2><p>Database-backed deadlines with approved Excel, PDF and Google Slides links.</p></div><span className="status-badge status-active">{activeItems.length} active</span></div>
    {error && <div className="error-banner">{error}</div>}
    {canEdit && <form className="important-work-form" onSubmit={save}>
      <h3>{editingId ? 'Edit important work' : 'Add important work'}</h3>
      <input required maxLength="160" placeholder="Work title" value={form.title} onChange={(e) => setField('title', e.target.value)} />
      <input maxLength="120" placeholder="Owner / PIC" value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} />
      <input required type="email" placeholder="Reminder email" value={form.reminderEmail} onChange={(e) => setField('reminderEmail', e.target.value)} />
      <input required type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
      <select value={form.priority} onChange={(e) => setField('priority', e.target.value)}>{['Low','Medium','High','Critical'].map((v) => <option key={v}>{v}</option>)}</select>
      <select value={form.status} onChange={(e) => setField('status', e.target.value)}>{['Planned','In Progress','Waiting','Completed','Cancelled'].map((v) => <option key={v}>{v}</option>)}</select>
      <textarea className="wide" maxLength="2000" placeholder="Notes / next action" value={form.description} onChange={(e) => setField('description', e.target.value)} />
      {form.links.map((link, index) => <div className="work-link-row wide" key={index}>
        <select value={link.type} onChange={(e) => setLink(index, 'type', e.target.value)}>{['Excel','PDF','Google Slides'].map((v) => <option key={v}>{v}</option>)}</select>
        <input maxLength="120" placeholder="Link label" value={link.label} onChange={(e) => setLink(index, 'label', e.target.value)} />
        <input required type="url" maxLength="1000" placeholder="Google Drive, OneDrive or SharePoint HTTPS link" value={link.url} onChange={(e) => setLink(index, 'url', e.target.value)} />
      </div>)}
      <div className="wide work-form-actions"><button type="button" className="btn btn-outline" onClick={() => setForm((current) => ({ ...current, links: [...current.links, { type: 'PDF', label: '', url: '' }] }))}><Plus size={13}/> Add link</button><button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={13}/> : <Save size={13}/>} Save</button></div>
    </form>}
    {loading ? <div className="loading-state"><Loader2 className="animate-spin"/> Loading reminders…</div> : <div className="important-work-grid">{items.map((item) => <article className={`important-work-card priority-${item.priority.toLowerCase()}`} key={item._id}>
      <div className="work-card-head"><div><span>{item.priority}</span><h3>{item.title}</h3></div><b>{dueLabel(item.dueDate)}</b></div>
      <p>{item.description || 'No notes added.'}</p><dl><div><dt>Owner</dt><dd>{item.ownerName || '—'}</dd></div><div><dt>Status</dt><dd>{item.status}</dd></div><div><dt>Due</dt><dd>{item.dueDate}</dd></div><div><dt>Reminder</dt><dd>{item.reminderEmail}</dd></div></dl>
      <div className="work-links">{item.links?.map((link) => { const Icon = icons[link.type] || FileText; return <a key={link._id || link.url} href={link.url} target="_blank" rel="noopener noreferrer"><Icon size={14}/>{link.label || link.type}<ExternalLink size={11}/></a>; })}</div>
      {canEdit && <div className="work-card-actions"><button className="btn btn-outline btn-sm" onClick={() => edit(item)}>Edit</button><button className="btn btn-primary btn-sm" onClick={() => remind(item)}><BellRing size={12}/> Send reminder</button></div>}
      {item.lastReminderSentAt && <small>Last reminder: {new Date(item.lastReminderSentAt).toLocaleString()}</small>}
    </article>)}</div>}
  </section>;
}

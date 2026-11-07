import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Loader2, Pencil, Save, Trash2, X } from 'lucide-react';
import { createImportantWork, deleteImportantWork, fetchImportantWork, updateImportantWork, approveImportantWork, handoffImportantWork } from '../services/importantWorkService';
import './ImportantWorkSection.css';
import {CreativeMembers} from './CreativeMembers';
import {fetchCreativeMembers,addCreativeMember,editCreativeMember,deleteCreativeMember} from '../services/importantWorkService';
import {BusinessContacts} from './BusinessContacts';
import {fetchBusinessContacts,addBusinessContact,deleteBusinessContact,markDesignSent} from '../services/importantWorkService';
import {DESIGN_TEAM_DEFAULTS} from '../services/designTeamDefaults';
import {fetchDesignTeams,saveDesignTeams} from '../services/importantWorkService';

const EMPTY_FORM = { title: '', designerName: '', supervisorName: '', process: 'Planned', dueDate: '', designType:'Print', designDriveUrl:'',designChecked:false,designerEmail:'',merchandisingEmail:'',businessUnit:'Bank',businessHeadEmail:'',bpEmail:'' };
const PROCESSES = ['Planned', 'Designing', 'Review', 'Revision'];
const EDIT_ROLES = new Set(['super_admin', 'admin', 'head_brand']);

const DEFAULT_DATA_SOURCE={fetchImportantWork,createImportantWork,updateImportantWork,deleteImportantWork,approveImportantWork,handoffImportantWork,fetchDesignTeams,saveDesignTeams,fetchBusinessContacts,addBusinessContact,deleteBusinessContact,markDesignSent,fetchCreativeMembers,addCreativeMember,editCreativeMember,deleteCreativeMember};
export function ImportantWorkSection({ user, users = [], onNotify, dataSource=DEFAULT_DATA_SOURCE }) {
  const [contacts,setContacts]=useState([]);
  const [members,setMembers]=useState([]);
  const [groups,setGroups]=useState(Object.fromEntries(Object.keys(DESIGN_TEAM_DEFAULTS).map(k=>[k,[]])));
  const [linkTarget,setLinkTarget]=useState(null);
  const [linkValue,setLinkValue]=useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = EDIT_ROLES.has(user?.role)&&['suhnin.phway@kbzbank.com','kyawzin.soe@kbzbank.com'].includes(user?.email);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await dataSource.fetchImportantWork());if(dataSource.fetchDesignTeams)setGroups(await dataSource.fetchDesignTeams());if(dataSource.fetchCreativeMembers)setMembers(await dataSource.fetchCreativeMembers()); if(dataSource.fetchBusinessContacts)setContacts(await dataSource.fetchBusinessContacts());setError(''); }
    catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [dataSource]);

  useEffect(() => { load(); }, [load]);
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setError(''); };

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (editingId) await dataSource.updateImportantWork(editingId, form);
      else await dataSource.createImportantWork(form);
      onNotify?.(editingId ? 'Important work updated.' : 'Important work added.', 'success');
      resetForm(); await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  };

  const edit = (item) => {
    setEditingId(item._id);
    setForm({ title: item.title || '', designerName: item.designerName || '', supervisorName: item.supervisorName || '', process: ['Approved','Completed'].includes(item.process)?'Review':item.process||'Planned', dueDate: item.dueDate || '', designType:item.designType||'Print',designDriveUrl:item.designDriveUrl||'',designChecked:item.designChecked||false,designerEmail:item.designerEmail||'',merchandisingEmail:item.merchandisingEmail||'',businessUnit:item.businessUnit||'Bank',businessHeadEmail:item.businessHeadEmail||'',bpEmail:item.bpEmail||'' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const approve=async item=>{if(!window.confirm(`Final approve “${item.title}” and its Drive file?`))return;setSaving(true);try{await dataSource.approveImportantWork(item._id);await load();}catch(e){setError(e.message)}finally{setSaving(false)}};
  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      await dataSource.deleteImportantWork(item._id);
      if (editingId === item._id) resetForm();
      onNotify?.('Important work deleted.', 'success');
      await load();
    } catch (deleteError) { setError(deleteError.message); }
  };

  return <section className="important-work-page">
    <header className="important-work-header"><div><h2><BellRing size={22} /> Important Work</h2><p>Design work, responsibility, process and due date.</p></div><span>{items.length} work item{items.length === 1 ? '' : 's'}</span></header>
    {error && <div className="error-banner">{error}</div>}
    {user?.role==='super_admin'&&<CreativeMembers members={members} dataSource={dataSource} onReload={load} onError={setError}/>}
    {user?.role==='super_admin'&&<BusinessContacts contacts={contacts} onChange={setContacts} dataSource={dataSource} user={user} onError={setError}/>}
    {canEdit && <form className="important-work-form" onSubmit={save}>
      <h3>{editingId ? 'Edit important work' : 'Add important work'}</h3>
      <label>Work Title<input required maxLength="160" value={form.title} onChange={(e) => setField('title', e.target.value)} /></label>
      <label>Business Unit<select value={form.businessUnit} onChange={e=>{setField('businessUnit',e.target.value);setField('businessHeadEmail','');setField('bpEmail','')}}>{['Bank','Pay','Comms'].map(u=><option key={u}>{u}</option>)}</select></label>
      <label>{form.businessUnit} Head *<select required value={form.businessHeadEmail} onChange={e=>setField('businessHeadEmail',e.target.value)}><option value="">Select Head account</option>{contacts.filter(c=>c.unit===form.businessUnit&&c.kind==='Head').map(c=><option key={c._id} value={c.email}>{c.name} · {c.email}</option>)}</select></label>
      <label>{form.businessUnit} BP *<select required value={form.bpEmail} onChange={e=>setField('bpEmail',e.target.value)}><option value="">Select BP account</option>{contacts.filter(c=>c.unit===form.businessUnit&&c.kind==='BP').map(c=><option key={c._id} value={c.email}>{c.name} · {c.email}</option>)}</select><small>စာရင်းမရှိသေးလျှင် Head & BP Accounts မှ အရင်ထည့်ပါ။</small></label>
      <label>Assigned Designer / Creator<select required value={form.designerEmail} onChange={e=>{setField('designerEmail',e.target.value);setField('designerName',members.find(m=>m.email===e.target.value)?.name||users.find(u=>u.email===e.target.value)?.name||e.target.value)}}><option value="">Select team member</option>{['Designer','Video & Photography','Copy'].map(team=><optgroup key={team} label={team}>{groups[team].map(email=><option key={email} value={email}>{members.find(m=>m.email===email)?.name||users.find(u=>u.email===email)?.name||email}</option>)}</optgroup>)}</select></label>
      <label>Supervising Designer<input required list="supervisor-users" maxLength="120" value={form.supervisorName} onChange={(e) => setField('supervisorName', e.target.value)} placeholder="Select or type a supervisor" /></label>
      <datalist id="designer-users">{users.map((item) => <option key={item.id || item._id} value={item.name}>{item.email}</option>)}</datalist><datalist id="supervisor-users"><option value="Kyaw Zin Soe">kyawzin.soe@kbzbank.com</option><option value="Su Hnin Phway">suhnin.phway@kbzbank.com</option>{users.map((item) => <option key={item.id || item._id} value={item.name}>{item.jobTitle || item.role}</option>)}</datalist>
      <label>Process<select value={form.process} onChange={(e) => setField('process', e.target.value)}>{PROCESSES.map((process) => <option key={process}>{process}</option>)}</select></label>
      <label>Design Type<select value={form.designType} onChange={e=>setField('designType',e.target.value)}><option value="Social">Social Design</option><option value="Video & Photography">Video & Photography</option><option value="Print">Print Design → Merchandising</option></select></label>
      {form.designType==='Print'&&<label>Assigned Merchandiser *<select required value={form.merchandisingEmail} onChange={e=>setField('merchandisingEmail',e.target.value)}><option value="">Select Merchandising member</option>{groups.Merchandising.map(email=><option key={email} value={email}>{members.find(m=>m.email===email)?.name||users.find(u=>u.email===email)?.name||email}</option>)}</select><small>Creative Head သို့မဟုတ် Art Director Approve ပြီးမှ ဤတာဝန်ခံထံ Auto ပို့ပါမည်။</small></label>}
      <label className="work-drive-field">Final Design Drive Link<input type="url" value={form.designDriveUrl} onChange={e=>setField('designDriveUrl',e.target.value)} placeholder="https://drive.google.com/file/d/FILE_ID/view"/><small>Design စကတည်းက Link ထည့်နိုင်ပါသည်။ Final Approval မတိုင်မီ နောက်ဆုံးဖိုင်ဖြစ်ကြောင်းစစ်ပါ။</small></label>
<label className="design-check"><input type="checkbox" checked={form.designChecked} onChange={e=>setField('designChecked',e.target.checked)}/>Final design checked</label>
      <label>Due Date<input required type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} /></label>
      <div className="work-form-actions">{editingId && <button type="button" className="btn btn-outline" onClick={resetForm}><X size={14} /> Cancel</button>}<button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {editingId ? 'Update' : 'Save'}</button></div>
    </form>}
    {loading ? <div className="loading-state"><Loader2 className="animate-spin" /> Loading important work…</div> : items.length === 0 ? <div className="empty-state">No important work has been added.</div> : <div className="important-work-list">
      <div className="important-work-list-head"><span>Work Title</span><span>Supervisor</span><span>Designer</span><span>Process</span><span>Due Date</span><span>Actions</span></div>
      {items.map((item) => <article className="important-work-row" key={item._id}>
        <strong data-label="Work Title">{item.title}<small className="work-design-type">{item.designType||'Print'} Design{item.designType==='Print'&&item.merchandisingEmail?` · Merchandiser: ${item.merchandisingEmail}`:''}</small>{item.designDriveUrl&&!dataSource.preview&&<a className="work-file-link" href={item.designDriveUrl} target="_blank" rel="noopener noreferrer">Open Design ↗</a>}{item.designDriveUrl&&dataSource.preview&&<small>နမူနာဖိုင် · Google Drive ဖိုင်အစစ်မဟုတ်ပါ</small>}</strong><span data-label="Supervisor">{item.supervisorName}</span><span data-label="Designer">{item.designerName}</span><span data-label="Process"><b className="process-badge">{item.process}</b>{(item.designApprovals||[]).map(a=><small className="work-design-type" key={a.email}>Approved by {a.slot}: {a.name} · {a.email} · {new Date(a.at).toLocaleString()}</small>)}{item.businessUnit&&<small className="work-design-type">{item.businessUnit} · Head: {item.businessHeadEmail} · BP: {item.bpEmail}</small>}{item.sentAt&&<small className="work-design-type">Sent · {item.bpEmail} · {new Date(item.sentAt).toLocaleString()}</small>}{item.handoffTo&&<small className="work-design-type">Sent to {item.handoffTo}{item.recipientName?` · ${item.recipientName}`:''}</small>}</span><time data-label="Due Date" dateTime={item.dueDate}>{item.dueDate}</time>
        <div className="important-work-actions" data-label="Actions">{!canEdit&&item.designerEmail===user?.email&&item.approvalStatus!=='Approved'&&!item.handoffTo&&<button className="btn btn-outline" onClick={()=>{setLinkTarget(item);setLinkValue(item.designDriveUrl||'')}}>Add / Edit Drive Link</button>}{item.designType!=='Print'&&item.approvalStatus==='Approved'&&!item.sentAt&&(canEdit||item.designerEmail===user?.email)&&<button className="btn btn-primary" disabled={saving} onClick={async()=>{if(!window.confirm(`Mark Sent to ${item.businessHeadEmail} and ${item.bpEmail}? This records delivery inside the Portal; it does not email or change Drive access.`))return;setSaving(true);try{await dataSource.markDesignSent(item._id);await load()}catch(e){setError(e.message)}finally{setSaving(false)}}}>Mark Sent</button>}{canEdit && <>{!item.handoffTo&&<button type="button" aria-label={`Edit ${item.title}`} onClick={() => edit(item)}><Pencil size={15} /></button>}{!item.handoffTo&&<button type="button" className="danger" aria-label={`Delete ${item.title}`} onClick={() => remove(item)}><Trash2 size={15} /></button>}{!item.handoffTo&&item.process==='Review'&&item.approvalStatus!=='Approved'&&<button type="button" className="btn btn-primary" disabled={saving||!item.designDriveUrl||!item.designChecked||(item.designType==='Print'&&(!['suhnin.phway@kbzbank.com','kyawzin.soe@kbzbank.com'].includes(user?.email)))} onClick={()=>approve(item)}>{item.designType==='Print'?'Approve Design':'Final Approve'}</button>}</>}</div>
      </article>)}
    </div>}
    {linkTarget&&<div className="modal-overlay"><form className="modal-card" onSubmit={async e=>{e.preventDefault();setSaving(true);try{await dataSource.updateImportantWork(linkTarget._id,{designDriveUrl:linkValue});setLinkTarget(null);await load()}catch(err){setError(err.message)}finally{setSaving(false)}}}><h3>Design Drive Link · {linkTarget.title}</h3><label>Google Drive Link<input required type="url" value={linkValue} onChange={e=>setLinkValue(e.target.value)}/></label><p>Save ပြီးလျှင် Head Review အတွက် ပို့ပါမည်။</p><div className="modal-footer"><button type="button" className="btn btn-outline" onClick={()=>setLinkTarget(null)}>Cancel</button><button className="btn btn-primary" disabled={saving}>Save Link</button></div></form></div>}
  </section>;
}

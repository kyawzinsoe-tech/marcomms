import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { PERMISSIONS, hasPermission } from '../../config/rbac';
import { createProperty, deleteProperty, fetchProperties, updateProperty } from '../../services/propertyService';
import './PropertiesListSection.css';
import './column-picker.css';
import {viewUnits, managedUnits} from '../../utils/menuAccess';

const UNITS = ['All', 'Bank', 'Pay', 'Comms', 'Research', 'Creative', 'Merchandising'];
const TYPES = {
  Computer: ['Desktop Set', 'Laptop'],
  Camera: ['DSLR Camera', 'Mirrorless Camera', 'Action Camera', 'Phone Camera'],
  Storage: ['HDD', 'USB Drive', 'Memory Stick'],
  Power: ['UPS'],
  'Data Drive': ['Photo & Video Archive', 'Photo Archive', 'Video Archive'],
  Audio: ['Microphone', 'Wireless Microphone', 'Camera Microphone'],
  Lighting: ['LED Light', 'Studio Light', 'Softbox'],
  'Camera Accessory': ['Lens', 'Camera Battery', 'Tripod', 'Camera Bag', 'Camera Flash', 'Stabilizer', 'Dry Box', 'Pole Mount for GoPro'],
  Other: ['Other']
};
const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Disposed'];
const DETAIL_FIELDS = { team: 'Sub-team', deviceNo: 'Device / Serial No.', keyboard: 'Keyboard', mouse: 'Mouse', charger: 'Charger / Cable', specification: 'Specification', brand: 'Brand / UPS Brand', drive: 'Drive', mainData: 'Main Data', description: 'Description', mediaType: 'Video / Photo' };
const GROUPS = ['All Equipment', 'Computers', 'Camera & Equipment', 'UPS & Accessories', 'Photo & Video Data'];
const groupOf = (item) => item.category === 'Computer' ? 'Computers' : item.category === 'Data Drive' ? 'Photo & Video Data' : ['Camera', 'Camera Accessory', 'Audio', 'Lighting'].includes(item.category) ? 'Camera & Equipment' : 'UPS & Accessories';
const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ propertyNo: '', date: today(), businessUnit: 'Bank', category: 'Computer', itemType: 'Desktop Set', customType: '', productName: '', quantity: 1, condition: 'Good', owner: '', includedAccessories: ['Desktop', 'Keyboard', 'Mouse'], details: {}, note: '' });
const accessoriesFor = (type) => type === 'Desktop Set' ? ['Desktop', 'Keyboard', 'Mouse'] : type === 'Laptop' ? ['Complete Laptop Set'] : [];

function Modal({ title, children, onClose }) {
  return <div className="property-modal-backdrop"><div className="property-modal" role="dialog" aria-modal="true"><div className="property-modal-head"><h3>{title}</h3><button type="button" onClick={onClose} aria-label="Close"><X /></button></div>{children}</div></div>;
}

export function PropertiesListSection({ user, onNotify, previewItems }) {
  const [items, setItems] = useState([]);
  const [unit, setUnit] = useState('All');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState('All Equipment');
  const [columns, setColumns] = useState([]);
  const visibleUnits = ['All', ...viewUnits(user,'properties')];
  const writableUnits = managedUnits(user);
  const canCreate = hasPermission(user, PERMISSIONS.PROPERTY_CREATE);
  const canUpdate = hasPermission(user, PERMISSIONS.PROPERTY_UPDATE);
  const canDelete = hasPermission(user, PERMISSIONS.PROPERTY_DELETE);

  const load = async () => { try { setItems(previewItems || await fetchProperties()); } catch (e) { onNotify?.(e.message, 'error'); } };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => items.filter((item) => (unit === 'All' || item.businessUnit === unit) && (group === 'All Equipment' || groupOf(item) === group) && [item.propertyNo, item.productName, item.itemType, item.owner].join(' ').toLowerCase().includes(query.toLowerCase())), [items, unit, group, query]);
  const detailKeys = form.category === 'Computer' ? ['team','deviceNo','keyboard','mouse','charger','specification'] : form.category === 'Data Drive' ? ['team','drive','mainData','description','mediaType'] : ['team','brand','deviceNo','charger','specification'];
  const totalQty = filtered.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const attention = filtered.filter((item) => ['Needs Repair', 'Damaged'].includes(item.condition)).length;

  const openAdd = () => { setForm({ ...blank(), businessUnit: writableUnits[0] || 'Bank' }); setMode('form'); setSelected(null); };
  const openEdit = (item) => { setSelected(item); setForm({ ...item, details: item.details || {}, date: String(item.date).slice(0, 10) }); setMode('form'); };
  const chooseCategory = (category) => { const itemType = TYPES[category][0]; setForm((f) => ({ ...f, category, itemType, customType: '', includedAccessories: accessoriesFor(itemType) })); };
  const chooseType = (itemType) => setForm((f) => ({ ...f, itemType, includedAccessories: accessoriesFor(itemType) }));
  const save = async (e) => { e.preventDefault(); setBusy(true); try { const saved = previewItems ? {...form, id: selected?.id || String(Date.now())} : selected ? await updateProperty(selected.id || selected._id, form) : await createProperty(form); setItems((list) => selected ? list.map((x) => (x.id || x._id) === (selected.id || selected._id) ? saved : x) : [saved, ...list]); setMode(null); onNotify?.(selected ? 'Property updated.' : 'Property added.', 'success'); } catch (err) { onNotify?.(err.message, 'error'); } finally { setBusy(false); } };
  const remove = async () => { setBusy(true); try { if (!previewItems) await deleteProperty(selected.id || selected._id); setItems((list) => list.filter((x) => (x.id || x._id) !== (selected.id || selected._id))); setMode(null); onNotify?.('Property deleted and audit log recorded.', 'success'); } catch (err) { onNotify?.(err.message, 'error'); } finally { setBusy(false); } };

  return <section className="properties-section">
    <div className="properties-title"><div><h2>Marcomms Properties List</h2><p>Bank, Pay, Comms, Research နှင့် Creative ပိုင်ပစ္စည်းများကို တစ်နေရာတည်းတွင် စီမံပါ။</p></div>{canCreate && <button className="btn-primary" onClick={openAdd}><Plus size={18}/> Add Property</button>}</div>
    <div className="property-tabs">{visibleUnits.map((x) => <button key={x} className={unit === x ? 'active' : ''} onClick={() => setUnit(x)}>{x}</button>)}</div>
    <div className="property-tabs">{GROUPS.map((x) => <button key={x} className={group === x ? 'active' : ''} onClick={() => setGroup(x)}>{x}</button>)}</div>
    <details className="property-column-picker"><summary>Choose additional columns</summary><div>{Object.entries(DETAIL_FIELDS).map(([key,label]) => <label key={key}><input type="checkbox" checked={columns.includes(key)} onChange={() => setColumns(c => c.includes(key) ? c.filter(x => x !== key) : [...c,key])}/>{label}</label>)}</div></details>
    <div className="property-kpis"><div><b>{filtered.length}</b><span>Property Records</span></div><div><b>{totalQty}</b><span>Total Quantity</span></div><div><b>{attention}</b><span>Needs Attention</span></div></div>
    <label className="property-search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search No., product, type or owner..." /></label>
    <div className="property-table-wrap"><table className="property-table"><thead><tr><th>No</th><th>Date</th><th>Name</th><th>Product Name</th><th>Quantity</th><th>Condition</th><th>Owner</th><th>Note</th>{columns.map(key => <th key={key}>{DETAIL_FIELDS[key]}</th>)}<th>Actions</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id || item._id}><td><b>{item.propertyNo}</b></td><td>{new Date(item.date).toLocaleDateString()}</td><td>{item.category} / {item.itemType === 'Other' ? item.customType : item.itemType}{item.includedAccessories?.length ? <small>{item.includedAccessories.join(', ')}</small> : null}</td><td>{item.productName}<small>{item.businessUnit}</small></td><td>{item.quantity}</td><td><span className={`condition condition-${item.condition.toLowerCase().replace(/\s/g, '-')}`}>{item.condition}</span></td><td>{item.owner}</td><td>{item.note || '—'}</td>{columns.map(key => <td key={key}>{item.details?.[key] || "—"}</td>)}<td><div className="property-actions"><button onClick={() => { setSelected(item); setMode('view'); }} title="Open"><Eye size={16}/></button>{canUpdate && writableUnits.includes(item.businessUnit) && <button onClick={() => openEdit(item)} title="Edit"><Pencil size={16}/></button>}{canDelete && writableUnits.includes(item.businessUnit) && <button onClick={() => { setSelected(item); setMode('delete'); }} title="Delete"><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></table>{!filtered.length && <div className="property-empty">No properties found. Add the first property record.</div>}</div>
    {mode === 'view' && selected && <Modal title="Property Details" onClose={() => setMode(null)}><div className="property-details">{[['No', selected.propertyNo], ['Date', new Date(selected.date).toLocaleDateString()], ['Business Unit', selected.businessUnit], ['Name', `${selected.category} / ${selected.itemType === 'Other' ? selected.customType : selected.itemType}`], ['Product Name', selected.productName], ['Quantity', selected.quantity], ['Condition', selected.condition], ['Owner', selected.owner], ['Included', selected.includedAccessories?.join(', ') || '—'], ['Note', selected.note || '—'], ...Object.entries(selected.details || {}).filter(([,v])=>v).map(([k,v])=>[DETAIL_FIELDS[k] || k,v])].map(([k,v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div></Modal>}
    {mode === 'delete' && selected && <Modal title="Delete Property?" onClose={() => setMode(null)}><p>This permanently deletes <b>{selected.propertyNo} — {selected.productName}</b>. This action will be recorded in the audit log.</p><div className="property-modal-actions"><button onClick={() => setMode(null)}>Cancel</button><button className="danger" disabled={busy} onClick={remove}>Delete Property</button></div></Modal>}
    {mode === 'form' && <Modal title={selected ? 'Edit Property' : 'Add Property'} onClose={() => setMode(null)}><form className="property-form" onSubmit={save}><label>No *<input required value={form.propertyNo} onChange={(e) => setForm({...form, propertyNo:e.target.value})} placeholder="e.g. PROP-001"/></label><label>Date *<input required type="date" value={form.date} onChange={(e) => setForm({...form, date:e.target.value})}/></label><label>Business Unit *<select value={form.businessUnit} onChange={(e) => setForm({...form, businessUnit:e.target.value})}>{visibleUnits.filter(x => x !== "All").map(x=><option key={x}>{x}</option>)}</select></label><label>Category *<select value={form.category} onChange={(e)=>chooseCategory(e.target.value)}>{Object.keys(TYPES).map(x=><option key={x}>{x}</option>)}</select></label><label>Type *<select value={form.itemType} onChange={(e)=>chooseType(e.target.value)}>{TYPES[form.category].map(x=><option key={x}>{x}</option>)}</select></label>{form.itemType==='Other' && <label>Custom Type *<input required value={form.customType} onChange={(e)=>setForm({...form,customType:e.target.value})}/></label>}<label>Product Name *<input required value={form.productName} onChange={(e)=>setForm({...form,productName:e.target.value})} placeholder="e.g. Dell Latitude 5450"/></label><label>Quantity *<input required min="1" type="number" value={form.quantity} onChange={(e)=>setForm({...form,quantity:Number(e.target.value)})}/></label><label>Condition *<select value={form.condition} onChange={(e)=>setForm({...form,condition:e.target.value})}>{CONDITIONS.map(x=><option key={x}>{x}</option>)}</select></label><label>Owner *<input required value={form.owner} onChange={(e)=>setForm({...form,owner:e.target.value})} placeholder="Person / Team"/></label>{form.includedAccessories.length>0 && <div className="property-accessories"><b>Included automatically</b><span>{form.includedAccessories.join(' + ')}</span></div>}{detailKeys.map(key => <label key={key}>{DETAIL_FIELDS[key]}<input value={form.details?.[key] || ""} onChange={e => setForm({...form, details: {...form.details, [key]: e.target.value}})} placeholder={key === "team" ? "Design / Content / Brand & Merch / Production" : DETAIL_FIELDS[key]}/></label>)}<label className="wide">Note<textarea value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})} placeholder="Serial no., location, warranty or other notes"/></label><div className="property-modal-actions wide"><button type="button" onClick={()=>setMode(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy?'Saving...':'Save Property'}</button></div></form></Modal>}
  </section>;
}

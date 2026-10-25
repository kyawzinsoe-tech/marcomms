import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Link2, Loader2, Plus, Trash2, X } from 'lucide-react';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(['image/png', 'image/jpeg']);
const FILE_TYPES = ['PNG', 'JPEG', 'GIF', 'MP4', 'PSD', 'AI'];
function validDriveUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(url.hostname) && Boolean(driveFileId(value)); } catch { return false; } }
function driveFileId(value) { const match = String(value || '').match(/\/file\/d\/([^/?#]+)/) || String(value || '').match(/[?&]id=([^&#]+)/); return match?.[1] || ''; }
function drivePreviewUrl(value) { const id = driveFileId(value); return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : ''; }
const blankLink = () => ({ label: '', fileType: 'PNG', url: '' });

export function AssetModal({ isOpen, onClose, onSave, asset, library }) {
  const [title, setTitle] = useState('');
  const [sourceMode, setSourceMode] = useState('upload');
  const [previewDriveUrl, setPreviewDriveUrl] = useState('');
  const [linkedFiles, setLinkedFiles] = useState([blankLink()]);
  const [file, setFile] = useState(null);
  const [localPreview, setLocalPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setTitle(asset?.title || ''); setSourceMode(asset?.uploadStatus === 'ready' ? 'upload' : 'drive'); setPreviewDriveUrl(asset?.uploadStatus === 'external' ? (asset?.fileUrl || '') : ''); setLinkedFiles(asset?.linkedFiles?.length ? asset.linkedFiles.map((item) => ({ ...item })) : [blankLink()]); setFile(null); setLocalPreview(''); setErrors({}); }, [asset, isOpen]);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);
  const remotePreview = useMemo(() => drivePreviewUrl(previewDriveUrl), [previewDriveUrl]);
  if (!isOpen) return null;
  const updateLink = (index, field, value) => setLinkedFiles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const selectFile = (event) => { const next = event.target.files?.[0] || null; if (localPreview) URL.revokeObjectURL(localPreview); setFile(next); setLocalPreview(next ? URL.createObjectURL(next) : ''); };
  const submit = async (event) => {
    event.preventDefault();
    const cleanLinks = linkedFiles.filter((item) => item.url.trim()).map((item) => ({ label: item.label.trim() || `${title.trim()} ${item.fileType}`, fileType: item.fileType, url: item.url.trim() }));
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = 'Title is required.';
    if (cleanLinks.some((item) => !validDriveUrl(item.url))) nextErrors.files = 'Every download link must be an individual Google Drive file link.';
    if (sourceMode === 'drive' && !validDriveUrl(previewDriveUrl)) nextErrors.preview = 'Paste an individual Google Drive image file link.';
    if (sourceMode === 'upload' && !file && !asset?.id) nextErrors.upload = 'Select a PNG or JPEG preview image.';
    if (sourceMode === 'upload' && file && !ALLOWED_UPLOAD_TYPES.has(file.type)) nextErrors.upload = 'Direct upload supports PNG/JPEG only.';
    if (sourceMode === 'upload' && file && file.size > MAX_FILE_BYTES) nextErrors.upload = 'Preview image must be 10 MB or smaller.';
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setSaving(true);
    try { await onSave({ title: title.trim(), library, linkedFiles: cleanLinks, previewDriveUrl: sourceMode === 'drive' ? previewDriveUrl.trim() : '', fileType: file?.type === 'image/jpeg' ? 'JPEG' : 'PNG', fileSize: file ? Math.ceil(file.size / 1024) : 0, ...(sourceMode === 'upload' && file ? { file } : {}) }); } finally { setSaving(false); }
  };
  return <div className="modal-overlay" onClick={onClose}><div className="modal-card brand-asset-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
    <div className="modal-header"><div><h3>{asset ? 'Edit Brand Asset' : 'Add Brand Asset'}</h3><p>ပုံသေချာပေါ်ရန် Direct PNG/JPEG Upload ကိုသုံးပါ။ Drive link သုံးလျှင် public individual-file link ဖြစ်ရပါမယ်။</p></div><button type="button" className="btn-close-modal" onClick={onClose} disabled={saving}><X size={18} /></button></div>
    <form onSubmit={submit} className="brand-asset-form">
      <label htmlFor="asset-title">Title *</label><input id="asset-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus disabled={saving} />
      {errors.title && <span className="field-error-msg"><AlertCircle size={12} />{errors.title}</span>}
      <div className="brand-link-heading"><div><b>1. Preview Image</b><small>Card ပေါ်တွင်မြင်ရမည့်ပုံကို Computer မှ PNG/JPEG ရွေးပါ၊ သို့မဟုတ် Google Drive individual image link ထည့်ပါ။</small></div></div>
      <div className="brand-source-toggle" role="group" aria-label="Preview image source"><button type="button" className={sourceMode === 'upload' ? 'active' : ''} onClick={() => setSourceMode('upload')}>Upload PNG/JPEG <small>Recommended</small></button><button type="button" className={sourceMode === 'drive' ? 'active' : ''} onClick={() => setSourceMode('drive')}>Drive Image Link</button></div>
      {sourceMode === 'drive' && <><div className="brand-link-input"><Link2 size={14} /><input type="url" placeholder="Google Drive individual PNG/JPEG share link" value={previewDriveUrl} onChange={(event) => setPreviewDriveUrl(event.target.value)} /></div>{errors.preview && <span className="field-error-msg"><AlertCircle size={12} />{errors.preview}</span>}</>}
      {sourceMode === 'upload' && <><label htmlFor="asset-upload">Preview photo (PNG/JPEG){asset?.id ? ' — replace optional' : ' *'}</label><input id="asset-upload" type="file" accept="image/png,image/jpeg" onChange={selectFile} /><small>Private database storage · Maximum 10 MB</small>{errors.upload && <span className="field-error-msg"><AlertCircle size={12} />{errors.upload}</span>}</>}
      {sourceMode === 'upload' && localPreview ? <img className="brand-asset-form-preview" src={localPreview} alt="Local preview" /> : sourceMode === 'drive' && remotePreview ? <iframe className="brand-asset-drive-preview" src={remotePreview} title="Google Drive preview" allow="autoplay" /> : null}
      <div className="brand-link-heading"><div><b>2. Download Drive Files (optional)</b><small>Download Here! ခလုတ်များအတွက် PNG/JPEG/AI/PSD ဖိုင်တစ်ခုချင်း၏ Share link ထည့်ပါ။ Preview Image နှင့် သီးခြားဖြစ်ပါသည်။</small></div><button type="button" className="btn btn-outline btn-sm" onClick={() => setLinkedFiles((current) => [...current, blankLink()])}><Plus size={13} /> Add file</button></div>
      {linkedFiles.map((item, index) => <div className="brand-linked-file-row" key={index}><select aria-label="File type" value={item.fileType} onChange={(event) => updateLink(index, 'fileType', event.target.value)}>{FILE_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input aria-label="File label" placeholder="e.g. Primary Logo RGB" value={item.label} onChange={(event) => updateLink(index, 'label', event.target.value)} /><div className="brand-link-input"><Link2 size={14} /><input type="url" placeholder="Paste Google Drive Share link" value={item.url} onChange={(event) => updateLink(index, 'url', event.target.value)} /></div>{linkedFiles.length > 1 && <button type="button" className="action-btn action-delete" onClick={() => setLinkedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button>}</div>)}
      {errors.files && <span className="field-error-msg"><AlertCircle size={12} />{errors.files}</span>}
      <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Asset'}</button></div>
    </form>
  </div></div>;
}

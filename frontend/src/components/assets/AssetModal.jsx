import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Link2, Loader2, Plus, Trash2, X } from 'lucide-react';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(['image/png', 'image/jpeg']);
const FILE_TYPES = ['PNG', 'JPEG', 'GIF', 'MP4', 'PSD', 'AI'];
function validDriveUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(url.hostname); } catch { return false; } }
function driveFileId(value) { const match = String(value || '').match(/\/file\/d\/([^/?#]+)/) || String(value || '').match(/[?&]id=([^&#]+)/); return match?.[1] || ''; }
function drivePreviewUrl(value) { const id = driveFileId(value); return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : ''; }
const blankLink = () => ({ label: '', fileType: 'PNG', url: '' });

export function AssetModal({ isOpen, onClose, onSave, asset, library }) {
  const [title, setTitle] = useState('');
  const [linkedFiles, setLinkedFiles] = useState([blankLink()]);
  const [file, setFile] = useState(null);
  const [localPreview, setLocalPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setTitle(asset?.title || ''); setLinkedFiles(asset?.linkedFiles?.length ? asset.linkedFiles.map((item) => ({ ...item })) : [blankLink()]); setFile(null); setLocalPreview(''); setErrors({}); }, [asset, isOpen]);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);
  const remotePreview = useMemo(() => drivePreviewUrl(linkedFiles.find((item) => validDriveUrl(item.url))?.url), [linkedFiles]);
  if (!isOpen) return null;
  const updateLink = (index, field, value) => setLinkedFiles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const selectFile = (event) => { const next = event.target.files?.[0] || null; if (localPreview) URL.revokeObjectURL(localPreview); setFile(next); setLocalPreview(next ? URL.createObjectURL(next) : ''); };
  const submit = async (event) => {
    event.preventDefault();
    const cleanLinks = linkedFiles.filter((item) => item.url.trim()).map((item) => ({ label: item.label.trim() || `${title.trim()} ${item.fileType}`, fileType: item.fileType, url: item.url.trim() }));
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = 'Title is required.';
    if (!asset && !file && cleanLinks.length === 0) nextErrors.files = 'Add a Google Drive link or select a PNG/JPEG preview image.';
    if (cleanLinks.some((item) => !validDriveUrl(item.url))) nextErrors.files = 'Every link must be a Google Drive or Google Docs Share link.';
    if (file && !ALLOWED_UPLOAD_TYPES.has(file.type)) nextErrors.upload = 'Direct upload supports PNG/JPEG only. Add PSD, AI, MP4 or GIF with a Drive link.';
    if (file && file.size > MAX_FILE_BYTES) nextErrors.upload = 'Preview image must be 10 MB or smaller.';
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setSaving(true);
    try { await onSave({ title: title.trim(), library, linkedFiles: cleanLinks, fileType: cleanLinks[0]?.fileType || (file?.type === 'image/jpeg' ? 'JPEG' : 'PNG'), fileSize: file ? Math.ceil(file.size / 1024) : 0, ...(file ? { file } : {}) }); } finally { setSaving(false); }
  };
  return <div className="modal-overlay" onClick={onClose}><div className="modal-card brand-asset-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
    <div className="modal-header"><div><h3>{asset ? 'Edit Brand Asset' : 'Add Brand Asset'}</h3><p>Paste Google Drive Share links for preview and individual downloads.</p></div><button type="button" className="btn-close-modal" onClick={onClose} disabled={saving}><X size={18} /></button></div>
    <form onSubmit={submit} className="brand-asset-form">
      <label htmlFor="asset-title">Title *</label><input id="asset-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus disabled={saving} />
      {errors.title && <span className="field-error-msg"><AlertCircle size={12} />{errors.title}</span>}
      <div className="brand-link-heading"><div><b>Design &amp; logo files</b><small>Drive: Share → General access “Anyone with the link” → Copy link</small></div><button type="button" className="btn btn-outline btn-sm" onClick={() => setLinkedFiles((current) => [...current, blankLink()])}><Plus size={13} /> Add file</button></div>
      {linkedFiles.map((item, index) => <div className="brand-linked-file-row" key={index}><select aria-label="File type" value={item.fileType} onChange={(event) => updateLink(index, 'fileType', event.target.value)}>{FILE_TYPES.map((type) => <option key={type}>{type}</option>)}</select><input aria-label="File label" placeholder="e.g. Primary Logo RGB" value={item.label} onChange={(event) => updateLink(index, 'label', event.target.value)} /><div className="brand-link-input"><Link2 size={14} /><input type="url" placeholder="Paste Google Drive Share link" value={item.url} onChange={(event) => updateLink(index, 'url', event.target.value)} /></div>{linkedFiles.length > 1 && <button type="button" className="action-btn action-delete" onClick={() => setLinkedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button>}</div>)}
      {errors.files && <span className="field-error-msg"><AlertCircle size={12} />{errors.files}</span>}
      {!asset && <><label htmlFor="asset-upload">Optional direct preview upload (PNG/JPEG)</label><input id="asset-upload" type="file" accept="image/png,image/jpeg" onChange={selectFile} /><small>Use this only when AWS storage is available. Drive-only assets do not need it.</small>{errors.upload && <span className="field-error-msg"><AlertCircle size={12} />{errors.upload}</span>}</>}
      {localPreview ? <img className="brand-asset-form-preview" src={localPreview} alt="Local preview" /> : remotePreview ? <iframe className="brand-asset-drive-preview" src={remotePreview} title="Google Drive preview" allow="autoplay" /> : null}
      <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Asset'}</button></div>
    </form>
  </div></div>;
}

import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(['image/png', 'image/jpeg']);

function validDriveUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function AssetModal({ isOpen, onClose, onSave, asset, library }) {
  const [title, setTitle] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(asset?.title || '');
    setDownloadUrl(asset?.downloadUrl || '');
    setFile(null);
    setPreviewUrl('');
    setErrors({});
  }, [asset, isOpen]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!isOpen) return null;

  const selectFile = (event) => {
    const nextFile = event.target.files?.[0] || null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : '');
    setErrors((current) => ({ ...current, file: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const cleanTitle = title.trim();
    const cleanDownloadUrl = downloadUrl.trim();

    if (!cleanTitle) nextErrors.title = 'Title is required.';
    if (!asset && !file) nextErrors.file = 'Select a PNG or JPEG image.';
    if (file && !ALLOWED_FILE_TYPES.has(file.type)) nextErrors.file = 'Only PNG and JPEG images are allowed.';
    if (file && file.size > MAX_FILE_BYTES) nextErrors.file = 'Image must be 10 MB or smaller.';
    if (!validDriveUrl(cleanDownloadUrl)) nextErrors.downloadUrl = 'Use a valid Google Drive or Google Docs HTTPS link.';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: cleanTitle,
        downloadUrl: cleanDownloadUrl,
        library,
        category: 'General',
        fileType: file?.type === 'image/jpeg' ? 'JPEG' : (asset?.fileType || 'PNG'),
        fileSize: file ? Math.ceil(file.size / 1024) : (asset?.fileSize || 0),
        ...(file ? { file } : {})
      });
    } finally {
      setSaving(false);
    }
  };

  const imageUrl = previewUrl || asset?.thumbnailUrl || asset?.fileUrl;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card brand-asset-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h3>{asset ? 'Edit Brand Asset' : 'Upload Brand Asset'}</h3>
            <p>Store the image privately and keep its details in the database.</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="brand-asset-form">
          <label htmlFor="brand-asset-title">Title *</label>
          <input id="brand-asset-title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={saving} autoFocus />
          {errors.title && <span className="field-error-msg"><AlertCircle size={12} />{errors.title}</span>}

          {!asset && (
            <>
              <label htmlFor="brand-asset-file">PNG/JPEG image *</label>
              <input id="brand-asset-file" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={selectFile} disabled={saving} />
              <small>Private storage · PNG/JPEG only · Maximum 10 MB</small>
              {errors.file && <span className="field-error-msg"><AlertCircle size={12} />{errors.file}</span>}
            </>
          )}

          {imageUrl && <img className="brand-asset-form-preview" src={imageUrl} alt="Asset preview" />}

          <label htmlFor="brand-asset-drive">Google Drive download link (optional)</label>
          <input
            id="brand-asset-drive"
            type="url"
            placeholder="https://drive.google.com/..."
            value={downloadUrl}
            onChange={(event) => setDownloadUrl(event.target.value)}
            disabled={saving}
          />
          {errors.downloadUrl && <span className="field-error-msg"><AlertCircle size={12} />{errors.downloadUrl}</span>}

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

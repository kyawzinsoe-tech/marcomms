import React, { useState, useEffect } from 'react';
import { X, UploadCloud, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { ASSET_LIBRARY_LABELS } from '../../services/assetService';

const CATEGORY_OPTIONS = [
  'General',
  'Logos & Lockups',
  'Brand Guidelines',
  'Typography & Fonts',
  'Key Visuals',
  'Templates & Layouts',
  'Icons & Graphics',
  'Digital Banners',
  'Signage & Print'
];

const FILE_TYPE_OPTIONS = ['PNG', 'SVG', 'AI', 'PSD', 'PDF', 'EPS', 'ZIP', 'JPG', 'MP4'];

export function AssetModal({ isOpen, onClose, onSave, asset, library }) {
  const [formData, setFormData] = useState({
    title: '',
    library: library || 'kbz_bank',
    category: 'Logos & Lockups',
    fileUrl: '',
    thumbnailUrl: '',
    fileType: 'PNG',
    fileSize: '',
    version: '1.0',
    tags: '',
    description: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setFieldErrors({});
    if (asset) {
      setFormData({
        title: asset.title || '',
        library: asset.library || library || 'kbz_bank',
        category: asset.category || 'General',
        fileUrl: asset.fileUrl || '',
        thumbnailUrl: asset.thumbnailUrl || '',
        fileType: asset.fileType || 'PNG',
        fileSize: asset.fileSize ? String(asset.fileSize) : '',
        version: asset.version || '1.0',
        tags: Array.isArray(asset.tags) ? asset.tags.join(', ') : (asset.tags || ''),
        description: asset.description || ''
      });
    } else {
      setFormData({
        title: '',
        library: library || 'kbz_bank',
        category: 'Logos & Lockups',
        fileUrl: '',
        thumbnailUrl: '',
        fileType: 'PNG',
        fileSize: '',
        version: '1.0',
        tags: '',
        description: ''
      });
    }
  }, [asset, library, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Asset title is required.';
    }
    if (!formData.fileUrl.trim()) {
      errors.fileUrl = 'File URL or storage link is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      ...formData,
      title: formData.title.trim(),
      fileUrl: formData.fileUrl.trim(),
      thumbnailUrl: formData.thumbnailUrl.trim(),
      fileSize: formData.fileSize ? Number(formData.fileSize) : 0,
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      description: formData.description.trim()
    };

    onSave(payload);
  };

  const libraryName = ASSET_LIBRARY_LABELS[library] || 'Brand';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div>
            <h3>{asset ? `Edit ${libraryName} Asset` : `Upload to ${libraryName} Library`}</h3>
            <p>Publish or update official brand assets, specifications, and download packages.</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Asset Title *</label>
                {fieldErrors.title && (
                  <span style={{ fontSize: '11.5px', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <AlertCircle size={12} /> {fieldErrors.title}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. KBZ Bank Primary Lockup - Horizontal"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                style={{ borderColor: fieldErrors.title ? '#ef4444' : undefined }}
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>File Format / Type</label>
              <select
                value={formData.fileType}
                onChange={(e) => handleChange('fileType', e.target.value)}
              >
                {FILE_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>File URL / S3 Download Link *</label>
                {fieldErrors.fileUrl && (
                  <span style={{ fontSize: '11.5px', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <AlertCircle size={12} /> {fieldErrors.fileUrl}
                  </span>
                )}
              </div>
              <input
                type="url"
                placeholder="https://... or /assets/brand/logo.ai"
                value={formData.fileUrl}
                onChange={(e) => handleChange('fileUrl', e.target.value)}
                style={{ borderColor: fieldErrors.fileUrl ? '#ef4444' : undefined }}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Preview / Thumbnail Image URL</label>
              <input
                type="url"
                placeholder="https://... (Optional preview image for card display)"
                value={formData.thumbnailUrl}
                onChange={(e) => handleChange('thumbnailUrl', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>File Size (Bytes or KB)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 2400000"
                value={formData.fileSize}
                onChange={(e) => handleChange('fileSize', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Version</label>
              <input
                type="text"
                placeholder="e.g. 1.0, 2026-Q3"
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Search Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. primary, vector, cmyk, print, dark-mode"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Description & Usage Guidelines</label>
              <textarea
                rows={3}
                placeholder="Usage rules, clear-space requirements, color codes..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  fontFamily: 'inherit',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <UploadCloud size={16} /> Save Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

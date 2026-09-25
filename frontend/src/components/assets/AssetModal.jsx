import React, { useState, useEffect } from 'react';
import { X, Loader2, Layers, Upload, Tag, AlertCircle, FileText } from 'lucide-react';
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

const FILE_TYPE_OPTIONS = ['PNG', 'JPEG'];

export function AssetModal({ isOpen, onClose, onSave, asset, library }) {
  const [formData, setFormData] = useState({
    title: '',
    library: library || 'kbz_bank',
    category: 'Logos & Lockups',
    fileUrl: '',
    thumbnailUrl: '',
    downloadUrl: '',
    fileType: 'PNG',
    fileSize: '',
    version: '1.0',
    tags: '',
    description: ''
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreview, setLocalPreview] = useState('');

  useEffect(() => {
    setValidationErrors({});
    setIsSaving(false);
    setSelectedFile(null);
    setLocalPreview('');
    if (asset) {
      setFormData({
        title: asset.title || '',
        library: asset.library || library || 'kbz_bank',
        category: asset.category || 'General',
        fileUrl: asset.fileUrl || '',
        thumbnailUrl: asset.thumbnailUrl || '',
        downloadUrl: asset.downloadUrl || '',
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
        downloadUrl: '',
        fileType: 'PNG',
        fileSize: '',
        version: '1.0',
        tags: '',
        description: ''
      });
    }
  }, [asset, library, isOpen]);

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    const cleanTitle = (formData.title || '').trim();
    if (!cleanTitle) {
      errors.title = 'Asset title is required.';
    }

    if (!asset && !selectedFile) {
      errors.file = 'Select a PNG or JPEG image.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    const payload = {
      ...formData,
      title: cleanTitle,
      library: formData.library || library || 'kbz_bank',
      fileUrl: asset?.fileUrl || '',
      thumbnailUrl: asset?.thumbnailUrl || '',
      downloadUrl: (formData.downloadUrl || '').trim(),
      fileSize: formData.fileSize ? Number(formData.fileSize) : 0,
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      description: (formData.description || '').trim()
    };
    if (selectedFile) payload.file = selectedFile;

    try {
      await onSave(payload);
    } catch {
      // Handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const libraryName = ASSET_LIBRARY_LABELS[library] || 'Brand';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-modal-title"
      >
        <div className="modal-header">
          <div>
            <h3 id="asset-modal-title">
              {asset ? `Edit ${libraryName} Asset` : `Upload to ${libraryName} Library`}
            </h3>
            <p>Publish or update official brand assets, specifications, and download packages.</p>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Asset Identity & Classification */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <Layers size={15} />
              <span>1. Asset Identity & Classification</span>
            </div>
            <div className="form-grid">
              <div className="form-group col-span-2">
                <label htmlFor="asset-title">Asset Title *</label>
                <input
                  id="asset-title"
                  type="text"
                  required
                  placeholder="e.g. KBZ Primary Logo (Vertical Lockup - RGB)"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  aria-invalid={!!validationErrors.title}
                />
                {validationErrors.title && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.title}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="asset-category">Asset Category *</label>
                <select
                  id="asset-category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  disabled={isSaving}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="asset-version">Version</label>
                <input
                  id="asset-version"
                  type="text"
                  placeholder="1.0"
                  value={formData.version}
                  onChange={(e) => handleChange('version', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Secure upload */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <Upload size={15} />
              <span>2. Secure Image Upload & Preview</span>
            </div>
            <div className="form-grid">
              {(!asset || selectedFile) && (
                <div className="form-group col-span-2">
                  <label htmlFor="asset-file">PNG/JPEG File *</label>
                  <input
                    id="asset-file"
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    required={!asset}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      if (localPreview) URL.revokeObjectURL(localPreview);
                      setLocalPreview(file ? URL.createObjectURL(file) : '');
                      if (file) {
                        handleChange('fileType', file.type === 'image/png' ? 'PNG' : 'JPEG');
                        handleChange('fileSize', Math.ceil(file.size / 1024));
                      }
                    }}
                    disabled={isSaving}
                  />
                  <small>Private storage · PNG/JPEG only · Maximum 10 MB</small>
                  {validationErrors.file && <span className="field-error-msg"><AlertCircle size={12} /> {validationErrors.file}</span>}
                </div>
              )}
              {(localPreview || asset?.thumbnailUrl || asset?.fileUrl) && (
                <div className="form-group col-span-2">
                  <label>Image Preview</label>
                  <div className="asset-upload-local-preview">
                    <img src={localPreview || asset.thumbnailUrl || asset.fileUrl} alt="Selected asset preview" />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="asset-file-type">File Type *</label>
                <select
                  id="asset-file-type"
                  value={formData.fileType}
                  onChange={(e) => handleChange('fileType', e.target.value)}
                  disabled={isSaving}
                >
                  {FILE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="asset-file-size">File Size (KB)</label>
                <input
                  id="asset-file-size"
                  type="number"
                  min="0"
                  placeholder="e.g. 2400"
                  value={formData.fileSize}
                  onChange={(e) => handleChange('fileSize', e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="form-group col-span-2">
                <label htmlFor="asset-download-url">Google Drive Download Link (Optional)</label>
                <input
                  id="asset-download-url"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.downloadUrl}
                  onChange={(e) => handleChange('downloadUrl', e.target.value)}
                  disabled={isSaving}
                />
                <small>Only Google Drive/Google Docs HTTPS links are accepted. Make sure intended users have Drive access.</small>
              </div>
            </div>
          </div>

          {/* Section 3: Metadata & Tagging */}
          <div className="modal-form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="modal-section-title">
              <Tag size={15} />
              <span>3. Metadata & Brand Guidelines</span>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="asset-tags">Search Tags (Comma-separated)</label>
              <input
                id="asset-tags"
                type="text"
                placeholder="e.g. logo, vector, primary, blue, cmyk, print"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="asset-desc">Usage Guidelines & Context</label>
              <textarea
                id="asset-desc"
                rows={3}
                placeholder="Optional notes on minimum clear space, acceptable background colors, or campaign restrictions..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                'Save Asset'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Loader2, Layers, Link as LinkIcon, Tag, AlertCircle, FileText } from 'lucide-react';
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

/**
 * Validates URLs including HTTP, HTTPS, S3, Google Drive share links, and relative paths
 */
function isValidUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (!trimmed) return false;

  // Allow relative paths
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return true;
  }

  // Allow standard URLs and custom protocols (e.g. s3://, drive://)
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 's3:', 'drive:'].includes(parsed.protocol) || parsed.hostname.length > 0;
  } catch {
    // Check if it's a domain/link pattern like drive.google.com/...
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
      return true;
    }
    return false;
  }
}

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

  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValidationErrors({});
    setIsSaving(false);
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
    const cleanFileUrl = (formData.fileUrl || '').trim();
    const cleanThumbUrl = (formData.thumbnailUrl || '').trim();

    if (!cleanTitle) {
      errors.title = 'Asset title is required.';
    }

    if (!cleanFileUrl) {
      errors.fileUrl = 'File URL or storage link is required.';
    } else if (!isValidUrl(cleanFileUrl)) {
      errors.fileUrl = 'Please enter a valid URL, Google Drive link, or storage path.';
    }

    if (cleanThumbUrl && !isValidUrl(cleanThumbUrl)) {
      errors.thumbnailUrl = 'Please enter a valid image preview URL or leave blank.';
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
      fileUrl: cleanFileUrl,
      thumbnailUrl: cleanThumbUrl,
      fileSize: formData.fileSize ? Number(formData.fileSize) : 0,
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      description: (formData.description || '').trim()
    };

    try {
      await onSave(payload);
    } catch (err) {
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

          {/* Section 2: Storage & Preview Links */}
          <div className="modal-form-section">
            <div className="modal-section-title">
              <LinkIcon size={15} />
              <span>2. Storage Links & Specifications</span>
            </div>
            <div className="form-grid">
              <div className="form-group col-span-2">
                <label htmlFor="asset-file-url">File Download URL / Cloud Storage Link *</label>
                <input
                  id="asset-file-url"
                  type="text"
                  required
                  placeholder="https://drive.google.com/... or https://assets.company.com/logo.ai"
                  value={formData.fileUrl}
                  onChange={(e) => handleChange('fileUrl', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.fileUrl}
                />
                {validationErrors.fileUrl && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.fileUrl}
                  </span>
                )}
              </div>

              <div className="form-group col-span-2">
                <label htmlFor="asset-thumb-url">Image Thumbnail / Preview URL (Optional)</label>
                <input
                  id="asset-thumb-url"
                  type="text"
                  placeholder="https://assets.company.com/thumbnails/logo-preview.png"
                  value={formData.thumbnailUrl}
                  onChange={(e) => handleChange('thumbnailUrl', e.target.value)}
                  disabled={isSaving}
                  aria-invalid={!!validationErrors.thumbnailUrl}
                />
                {validationErrors.thumbnailUrl && (
                  <span className="field-error-msg">
                    <AlertCircle size={12} /> {validationErrors.thumbnailUrl}
                  </span>
                )}
              </div>

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

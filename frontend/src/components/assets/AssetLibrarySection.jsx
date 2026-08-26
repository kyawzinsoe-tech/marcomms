import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  FileText,
  Image as ImageIcon,
  Layers,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Tag,
  AlertTriangle
} from 'lucide-react';
import {
  fetchAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  ASSET_LIBRARY_LABELS
} from '../../services/assetService';
import { PERMISSIONS, hasPermission } from '../../config/rbac';
import { AssetModal } from './AssetModal';
import { ErrorDialog } from '../common/ErrorDialog';

const PREVIEWABLE_IMAGE_TYPES = ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'GIF'];

function isImagePreviewable(url, fileType) {
  if (!url || typeof url !== 'string') return false;
  const type = (fileType || '').toUpperCase().trim();
  if (PREVIEWABLE_IMAGE_TYPES.includes(type)) return true;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return /\.(png|jpe?g|webp|svg|gif)$/.test(cleanUrl);
}

export function AssetLibrarySection({
  library,
  title,
  subtitle,
  icon,
  user,
  onNotify
}) {
  const IconComponent = icon || Layers;
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'title' | 'type'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState(null);

  // RBAC Permission checks for this specific library
  const canWrite = useMemo(() => {
    if (!user) return false;
    if (library === 'kbz_bank') return hasPermission(user, PERMISSIONS.ASSET_CREATE_BANK);
    if (library === 'kbz_pay') return hasPermission(user, PERMISSIONS.ASSET_CREATE_PAY);
    if (library === 'kbz_comms') return hasPermission(user, PERMISSIONS.ASSET_CREATE_COMMS);
    return false;
  }, [user, library]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    if (library === 'kbz_bank') return hasPermission(user, PERMISSIONS.ASSET_UPDATE_BANK) || hasPermission(user, PERMISSIONS.ASSET_CREATE_BANK);
    if (library === 'kbz_pay') return hasPermission(user, PERMISSIONS.ASSET_UPDATE_PAY) || hasPermission(user, PERMISSIONS.ASSET_CREATE_PAY);
    if (library === 'kbz_comms') return hasPermission(user, PERMISSIONS.ASSET_UPDATE_COMMS) || hasPermission(user, PERMISSIONS.ASSET_CREATE_COMMS);
    return false;
  }, [user, library]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    if (library === 'kbz_bank') return hasPermission(user, PERMISSIONS.ASSET_DELETE_BANK);
    if (library === 'kbz_pay') return hasPermission(user, PERMISSIONS.ASSET_DELETE_PAY);
    if (library === 'kbz_comms') return hasPermission(user, PERMISSIONS.ASSET_DELETE_COMMS);
    return false;
  }, [user, library]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAssets({ library });
      setAssets(data);
    } catch (err) {
      console.error(`Error loading assets for ${library}:`, err);
      setErrorMessage(err.message || `Unable to load ${ASSET_LIBRARY_LABELS[library] || 'brand'} assets from server.`);
    } finally {
      setLoading(false);
    }
  }, [library]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Extract unique categories for filter pills
  const categories = useMemo(() => {
    const set = new Set();
    assets.forEach((a) => {
      if (a.category) set.add(a.category.trim());
    });
    return ['All', ...Array.from(set).sort()];
  }, [assets]);

  // Filtered & Sorted Assets
  const processedAssets = useMemo(() => {
    let result = assets.filter((asset) => {
      const matchCat = selectedCategory === 'All' || asset.category === selectedCategory;
      const search = searchTerm.toLowerCase().trim();
      if (!search) return matchCat;

      const titleMatch = (asset.title || '').toLowerCase().includes(search);
      const descMatch = (asset.description || '').toLowerCase().includes(search);
      const catMatch = (asset.category || '').toLowerCase().includes(search);
      const tagMatch = Array.isArray(asset.tags) && asset.tags.some((t) => t.toLowerCase().includes(search));

      return matchCat && (titleMatch || descMatch || catMatch || tagMatch);
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'type') {
        return (a.fileType || '').localeCompare(b.fileType || '');
      }
      // 'newest' (default by createdAt or id descending)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [assets, selectedCategory, searchTerm, sortBy]);

  const isFilteringActive = searchTerm.trim() !== '' || selectedCategory !== 'All';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSortBy('newest');
  };

  // Create / Edit Handlers
  const handleOpenAdd = () => {
    if (!canWrite) return;
    setEditingAsset(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asset) => {
    if (!canEdit) return;
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingAsset) {
        await updateAsset(editingAsset.id, formData);
        onNotify?.(`Updated "${formData.title}" successfully.`, 'success');
      } else {
        await createAsset({ ...formData, library });
        onNotify?.(`Uploaded "${formData.title}" to ${ASSET_LIBRARY_LABELS[library] || 'library'}.`, 'success');
      }
      setIsModalOpen(false);
      setEditingAsset(null);
      await loadAssets();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to save brand asset.');
    }
  };

  const handleDelete = (asset) => {
    if (!canDelete) return;
    setPendingDeleteAsset(asset);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteAsset) return;
    try {
      await deleteAsset(pendingDeleteAsset.id);
      onNotify?.(`Asset "${pendingDeleteAsset.title}" deleted.`, 'info');
      setPendingDeleteAsset(null);
      await loadAssets();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to delete asset.');
    }
  };

  const sectionId = `asset-${library.replace(/_/g, '-')}`;
  const libraryLabel = ASSET_LIBRARY_LABELS[library] || title;

  return (
    <section className="card" id={sectionId} aria-label={`${libraryLabel} Asset Library`}>
      {/* Header */}
      <div className="card-header">
        <div>
          <h2>
            <IconComponent size={18} color="#6366f1" />
            {title || `${libraryLabel} Asset Library`}
          </h2>
          <p>
            {subtitle ||
              `Official brand identities, vector logomarks, typography, and marketing key visuals for ${libraryLabel}.`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadAssets}
            title="Refresh brand assets from repository"
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {canWrite && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
              title={`Upload a new asset to ${libraryLabel}`}
            >
              <Plus size={15} /> Upload Asset
            </button>
          )}
        </div>
      </div>

      {/* Library Summary Bar */}
      <div className="sub-summary-bar">
        <div className="sub-summary-item">
          <Layers size={14} className="sub-summary-icon" />
          <span>
            <b>{assets.length}</b> Brand Asset{assets.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="sub-summary-item">
          <CheckCircle2 size={14} className="sub-summary-icon success" />
          <span>
            <b>{Math.max(0, categories.length - 1)}</b> Categor{categories.length - 1 === 1 ? 'y' : 'ies'}
          </span>
        </div>
        {isFilteringActive && (
          <div className="sub-summary-item">
            <Filter size={14} className="sub-summary-icon cost" />
            <span>
              <b>{processedAssets.length}</b> Matching Filters
            </span>
          </div>
        )}
      </div>

      {/* Command & Filter Bar */}
      <div className="table-filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-input-icon" />
          <input
            type="text"
            placeholder={`Search ${libraryLabel} assets, tags, or guidelines...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={`Search ${libraryLabel} assets`}
          />
        </div>

        <div className="select-input-wrap">
          <ArrowUpDown size={14} className="filter-input-icon" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort assets"
            style={{ minWidth: '150px' }}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="title">Sort: Title (A-Z)</option>
            <option value="type">Sort: File Type</option>
          </select>
        </div>

        {isFilteringActive && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleResetFilters}
            title="Clear all active filters"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={12} /> Reset ({processedAssets.length}/{assets.length})
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div className="asset-category-pills" role="tablist" aria-label="Category filters">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`asset-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content Collection */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '54px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
          <p style={{ fontSize: '13px' }}>Loading {libraryLabel} repository assets...</p>
        </div>
      ) : processedAssets.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="empty-state-icon">
            <FolderOpen size={24} color="#6366f1" />
          </div>
          <b>No assets found</b>
          <p>
            {isFilteringActive
              ? 'No brand assets match your search and filter criteria.'
              : `No brand assets have been uploaded to the ${libraryLabel} library yet.`}
          </p>
          {isFilteringActive ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleResetFilters}
              style={{ marginTop: '8px' }}
            >
              <RotateCcw size={13} /> Reset Filters
            </button>
          ) : canWrite ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ marginTop: '8px' }}
            >
              <Plus size={14} /> Upload First Asset
            </button>
          ) : null}
        </div>
      ) : (
        <div className="asset-grid">
          {processedAssets.map((asset) => (
            <div key={asset.id} className="asset-card">
              <div>
                {/* Header & Badges */}
                <div className="asset-card-top">
                  <span className="asset-type-badge">{asset.fileType || 'ASSET'}</span>
                  <span className="asset-cat-tag">{asset.category || 'General'}</span>
                </div>

                {/* Preview Thumbnail */}
                {asset.thumbnailUrl && isImagePreviewable(asset.thumbnailUrl, asset.fileType) ? (
                  <div className="asset-thumbnail-wrap">
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.title}
                      className="asset-thumbnail-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="asset-thumbnail-fallback">
                    {['PDF', 'AI', 'PSD', 'EPS', 'ZIP'].includes((asset.fileType || '').toUpperCase()) ? (
                      <FileText size={28} />
                    ) : (
                      <ImageIcon size={28} />
                    )}
                  </div>
                )}

                {/* Title and Description */}
                <h4 className="asset-card-title" title={asset.title}>
                  {asset.title}
                </h4>

                {asset.description && (
                  <p className="asset-card-desc" title={asset.description}>
                    {asset.description}
                  </p>
                )}

                {/* Tags */}
                {Array.isArray(asset.tags) && asset.tags.length > 0 && (
                  <div className="asset-tags-wrap">
                    {asset.tags.map((tag, idx) => (
                      <span key={idx} className="asset-tag-pill">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer & Actions */}
              <div className="asset-card-footer">
                <span className="asset-version-text">
                  v{asset.version || '1.0'}
                  {asset.fileSize ? ` • ${asset.fileSize} KB` : ''}
                </span>

                <div className="asset-card-actions">
                  {asset.fileUrl && (
                    <a
                      href={asset.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none' }}
                      title={`Download ${asset.title}`}
                      aria-label={`Download ${asset.title}`}
                    >
                      <Download size={13} /> Download
                    </a>
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      className="action-btn action-edit"
                      onClick={() => handleOpenEdit(asset)}
                      title={`Edit ${asset.title}`}
                      aria-label={`Edit ${asset.title}`}
                    >
                      <Edit size={14} />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      className="action-btn action-delete"
                      onClick={() => handleDelete(asset)}
                      title={`Delete ${asset.title}`}
                      aria-label={`Delete ${asset.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Edit Modal */}
      {isModalOpen && (
        <AssetModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAsset(null);
          }}
          onSave={handleSave}
          asset={editingAsset}
          library={library}
        />
      )}

      {/* Safe Delete Confirmation Modal */}
      {pendingDeleteAsset && (
        <div className="modal-overlay" onClick={() => setPendingDeleteAsset(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-asset-title"
            style={{ maxWidth: '460px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-light)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--danger-text)',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 id="delete-asset-title" style={{ fontSize: '16px' }}>Permanently Delete Asset</h3>
                  <p style={{ fontSize: '12.5px' }}>{pendingDeleteAsset.title}</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <b>{pendingDeleteAsset.title}</b> from {libraryLabel}? This action cannot be undone.
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPendingDeleteAsset(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Error Dialog */}
      <ErrorDialog
        isOpen={Boolean(errorMessage)}
        title="Brand Asset Alert"
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </section>
  );
}

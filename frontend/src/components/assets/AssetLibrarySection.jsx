import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Download,
  ExternalLink,
  Edit,
  Trash2,
  FileText,
  Image as ImageIcon,
  Layers,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  FolderOpen
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

export function AssetLibrarySection({
  library,
  title,
  subtitle,
  icon: IconComponent = Layers,
  user,
  onNotify
}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // RBAC Permission checks for this specific library
  const canWrite = useMemo(() => {
    if (!user) return false;
    if (library === 'kbz_bank') return hasPermission(user, PERMISSIONS.ASSET_CREATE_BANK);
    if (library === 'kbz_pay') return hasPermission(user, PERMISSIONS.ASSET_CREATE_PAY);
    if (library === 'kbz_comms') return hasPermission(user, PERMISSIONS.ASSET_CREATE_COMMS);
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
    setError(null);
    try {
      const data = await fetchAssets({ library });
      setAssets(data);
    } catch (err) {
      console.error(`Error loading assets for ${library}:`, err);
      setError(err.message || 'Failed to load assets.');
    } finally {
      setLoading(false);
    }
  }, [library]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Extract unique categories for filter tabs
  const categories = useMemo(() => {
    const set = new Set();
    assets.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ['All', ...Array.from(set)];
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchCat = selectedCategory === 'All' || asset.category === selectedCategory;
      const search = searchTerm.toLowerCase().trim();
      if (!search) return matchCat;

      const titleMatch = (asset.title || '').toLowerCase().includes(search);
      const descMatch = (asset.description || '').toLowerCase().includes(search);
      const catMatch = (asset.category || '').toLowerCase().includes(search);
      const tagMatch = Array.isArray(asset.tags) && asset.tags.some((t) => t.toLowerCase().includes(search));

      return matchCat && (titleMatch || descMatch || catMatch || tagMatch);
    });
  }, [assets, selectedCategory, searchTerm]);

  // Create / Edit Handlers
  const handleOpenAdd = () => {
    if (!canWrite) return;
    setEditingAsset(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asset) => {
    if (!canWrite) return;
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    setActionLoading(true);
    try {
      if (editingAsset) {
        await updateAsset(editingAsset.id, formData);
        onNotify?.(`Updated "${formData.title}" successfully.`, 'success');
      } else {
        await createAsset({ ...formData, library });
        onNotify?.(`Uploaded "${formData.title}" to ${ASSET_LIBRARY_LABELS[library]}.`, 'success');
      }
      setIsModalOpen(false);
      setEditingAsset(null);
      await loadAssets();
    } catch (err) {
      onNotify?.(err.message || 'Failed to save asset.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (asset) => {
    if (!canDelete) return;
    if (window.confirm(`Permanently delete asset "${asset.title}"? This cannot be undone.`)) {
      try {
        await deleteAsset(asset.id);
        onNotify?.(`Asset "${asset.title}" deleted.`, 'info');
        await loadAssets();
      } catch (err) {
        onNotify?.(err.message || 'Failed to delete asset.', 'error');
      }
    }
  };

  const sectionId = `asset-${library.replace(/_/g, '-')}`;
  const libraryLabel = ASSET_LIBRARY_LABELS[library] || title;

  return (
    <section className="card" id={sectionId}>
      <div className="card-header">
        <div>
          <h2>
            <IconComponent size={20} color="#6366f1" />
            {title || `${libraryLabel} Asset Library`}
          </h2>
          <p>
            {subtitle || `Official brand identities, vector logomarks, typography, and marketing key visuals for ${libraryLabel}.`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadAssets}
            title="Refresh assets"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {canWrite && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
            >
              <Plus size={16} /> Upload Asset
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }}
          />
          <input
            type="text"
            placeholder={`Search ${libraryLabel} assets, tags, or guidelines...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory(cat)}
              style={{
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                padding: '4px 12px'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading {libraryLabel} assets from repository...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
          <b>Unable to load assets:</b> {error}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-state-icon">
            <FolderOpen size={28} color="#6366f1" />
          </div>
          <b>No assets found</b>
          <p>
            {searchTerm || selectedCategory !== 'All'
              ? 'No assets match your search and filter criteria.'
              : `No brand assets uploaded to the ${libraryLabel} library yet.`}
          </p>
          {canWrite && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ marginTop: '12px' }}
            >
              <Plus size={14} /> Upload First Asset
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '16px',
            marginTop: '8px'
          }}
        >
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div>
                {/* Header & Thumbnail/Type Tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span
                    className="badge"
                    style={{
                      background: '#f1f5f9',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {asset.fileType || 'ASSET'}
                  </span>

                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748b',
                      fontWeight: 600,
                      background: '#eef2ff',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    {asset.category || 'General'}
                  </span>
                </div>

                {/* Preview Thumbnail if available */}
                {asset.thumbnailUrl ? (
                  <div
                    style={{
                      width: '100%',
                      height: '130px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#f8fafc',
                      marginBottom: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.title}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '80px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8'
                    }}
                  >
                    <ImageIcon size={28} />
                  </div>
                )}

                {/* Title and Description */}
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                  {asset.title}
                </h4>

                {asset.description && (
                  <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '10px', lineHeight: '1.4' }}>
                    {asset.description}
                  </p>
                )}

                {/* Tags */}
                {Array.isArray(asset.tags) && asset.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {asset.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '10.5px',
                          color: '#475569',
                          background: '#f1f5f9',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer & Actions */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  v{asset.version || '1.0'}
                </span>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {asset.fileUrl && (
                    <a
                      href={asset.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Download size={13} /> Download
                    </a>
                  )}

                  {canWrite && (
                    <button
                      type="button"
                      className="action-btn action-edit"
                      onClick={() => handleOpenEdit(asset)}
                      title="Edit asset details"
                    >
                      <Edit size={13} />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      className="action-btn action-delete"
                      onClick={() => handleDelete(asset)}
                      title="Delete asset"
                    >
                      <Trash2 size={13} />
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
    </section>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Edit, FolderOpen, Image as ImageIcon, Layers, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { AssetModal } from './AssetModal';
import { ErrorDialog } from '../common/ErrorDialog';
import { PERMISSIONS, hasPermission } from '../../config/rbac';
import {
  ASSET_LIBRARY_LABELS,
  deleteAsset,
  fetchAssetDownloadUrl,
  fetchAssets,
  updateAsset,
  uploadBrandAsset
} from '../../services/assetService';

const permissionFor = (library, operation) => {
  const suffix = library === 'kbz_pay' ? 'PAY' : library === 'kbz_comms' ? 'COMMS' : 'BANK';
  return PERMISSIONS[`ASSET_${operation}_${suffix}`];
};

export function AssetLibrarySection({ library, title, subtitle, icon, user, onNotify }) {
  const Icon = icon || Layers;
  const label = ASSET_LIBRARY_LABELS[library] || 'Brand';
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [progress, setProgress] = useState(0);
  const [brokenImages, setBrokenImages] = useState(() => new Set());
  const [error, setError] = useState(null);

  const canCreate = Boolean(user && hasPermission(user, permissionFor(library, 'CREATE')));
  const canEdit = Boolean(user && (hasPermission(user, permissionFor(library, 'UPDATE')) || canCreate));
  const canDelete = Boolean(user && hasPermission(user, permissionFor(library, 'DELETE')));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAssets(await fetchAssets({ library }));
      setBrokenImages(new Set());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load brand assets.');
    } finally {
      setLoading(false);
    }
  }, [library]);

  useEffect(() => { load(); }, [load]);

  const visibleAssets = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...assets]
      .filter((asset) => !term || (asset.title || '').toLowerCase().includes(term))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [assets, query]);

  const save = async (data) => {
    try {
      if (editing) {
        await updateAsset(editing.id, { title: data.title, downloadUrl: data.downloadUrl });
        onNotify?.(`Updated “${data.title}”.`, 'success');
      } else {
        await uploadBrandAsset({
          title: data.title,
          downloadUrl: data.downloadUrl,
          library,
          category: 'General'
        }, data.file, setProgress);
        onNotify?.(`Uploaded “${data.title}”.`, 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setProgress(0);
      await load();
    } catch (saveError) {
      setProgress(0);
      setError(saveError.message || 'Unable to save asset.');
      throw saveError;
    }
  };

  const download = async (asset) => {
    try {
      const url = asset.downloadUrl || await fetchAssetDownloadUrl(asset.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      setError(downloadError.message || 'Unable to download asset.');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await deleteAsset(deleting.id);
      onNotify?.(`Removed “${deleting.title}”.`, 'info');
      setDeleting(null);
      await load();
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to remove asset.');
    }
  };

  return (
    <section className="card brand-assets" id={`asset-${library.replaceAll('_', '-')}`}>
      <div className="card-header">
        <div>
          <h2><Icon size={18} color="#6366f1" />{title || `${label} Asset Library`}</h2>
          <p>{subtitle || `Preview and download approved ${label} brand assets.`}</p>
        </div>
        <div className="brand-assets-header-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {canCreate && <button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={15} /> Upload Asset</button>}
        </div>
      </div>

      {progress > 0 && <div className="brand-assets-progress" role="status">{['Validating', 'Uploading', 'Verifying', 'Ready'].map((text, index) => <span key={text} className={progress > index ? 'done' : ''}>{text}</span>)}</div>}

      <div className="brand-assets-toolbar">
        <span><b>{assets.length}</b> asset{assets.length === 1 ? '' : 's'}</span>
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title" /></label>
      </div>

      {loading ? (
        <div className="brand-assets-empty"><RefreshCw className="animate-spin" /><p>Loading assets...</p></div>
      ) : visibleAssets.length === 0 ? (
        <div className="brand-assets-empty"><FolderOpen /><b>No assets found</b><p>Upload a PNG or JPEG to start the library.</p></div>
      ) : (
        <div className="brand-assets-grid">
          {visibleAssets.map((asset) => (
            <article className="brand-asset-card" key={asset.id}>
              <div className="brand-asset-preview">
                {asset.thumbnailUrl && !brokenImages.has(asset.id) ? (
                  <img src={asset.thumbnailUrl} alt={asset.title} onError={() => setBrokenImages((current) => new Set(current).add(asset.id))} />
                ) : <ImageIcon />}
              </div>
              <h3>{asset.title}</h3>
              <p>{asset.fileType || 'IMAGE'}{asset.fileSize ? ` · ${asset.fileSize} KB` : ''}</p>
              <div className="brand-asset-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => download(asset)}><Download size={13} /> Download</button>
                {canEdit && <button type="button" className="action-btn action-edit" onClick={() => { setEditing(asset); setModalOpen(true); }} aria-label={`Edit ${asset.title}`}><Edit size={14} /></button>}
                {canDelete && <button type="button" className="action-btn action-delete" onClick={() => setDeleting(asset)} aria-label={`Remove ${asset.title}`}><Trash2 size={14} /></button>}
              </div>
            </article>
          ))}
        </div>
      )}

      <AssetModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={save} asset={editing} library={library} />

      {deleting && (
        <div className="modal-overlay" onClick={() => setDeleting(null)}>
          <div className="modal-card brand-asset-delete" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <h3>Remove “{deleting.title}”?</h3>
            <p>This removes the database record and its private stored image.</p>
            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="btn btn-danger" onClick={remove}>Remove</button></div>
          </div>
        </div>
      )}

      <ErrorDialog open={Boolean(error)} title="Brand Asset Alert" message={error || ''} onClose={() => setError(null)} />
    </section>
  );
}

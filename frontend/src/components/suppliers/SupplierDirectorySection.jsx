import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Star,
  RefreshCw,
  CheckCircle2,
  Clock,
  Truck,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Tag,
  AlertTriangle,
  UserCheck,
  FileText
} from 'lucide-react';
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../../services/supplierService';
import { PERMISSIONS, hasPermission } from '../../config/rbac';
import { SupplierModal } from './SupplierModal';
import { ErrorDialog } from '../common/ErrorDialog';

export function SupplierDirectorySection({ user, onNotify }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Safe Delete Confirmation State
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // RBAC Permission checks
  const canRead = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.SUPPLIER_READ);
  }, [user]);

  const canCreate = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.SUPPLIER_CREATE);
  }, [user]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.SUPPLIER_UPDATE) || hasPermission(user, PERMISSIONS.SUPPLIER_CREATE);
  }, [user]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.SUPPLIER_DELETE);
  }, [user]);

  const loadSuppliers = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setErrorMessage(err.message || 'Unable to load supplier directory from server.');
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Extract unique categories dynamically from supplier records
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    suppliers.forEach((s) => {
      if (Array.isArray(s.categories)) {
        s.categories.forEach((c) => {
          const clean = typeof c === 'string' ? c.trim() : '';
          if (clean) set.add(clean);
        });
      }
    });
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [suppliers]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === 'Active').length;
    const underReview = suppliers.filter((s) => s.status === 'Under Review').length;
    const inactive = suppliers.filter((s) => s.status === 'Inactive').length;
    const categoryCount = Math.max(0, uniqueCategories.length - 1);
    const topRated = suppliers.filter((s) => Number(s.rating) >= 5).length;
    return { total, active, underReview, inactive, categoryCount, topRated };
  }, [suppliers, uniqueCategories]);

  // Filtered & Sorted Suppliers without mutating state
  const processedSuppliers = useMemo(() => {
    const result = suppliers.filter((s) => {
      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchCat =
        categoryFilter === 'All' ||
        (Array.isArray(s.categories) &&
          s.categories.some((c) => (c || '').toLowerCase() === categoryFilter.toLowerCase()));

      const search = searchTerm.toLowerCase().trim();
      if (!search) return matchStatus && matchCat;

      const nameMatch = (s.name || '').toLowerCase().includes(search);
      const codeMatch = (s.code || '').toLowerCase().includes(search);
      const contactMatch = (s.contactPerson || '').toLowerCase().includes(search);
      const emailMatch = (s.email || '').toLowerCase().includes(search);
      const phoneMatch = (s.phone || '').toLowerCase().includes(search);
      const addressMatch = (s.address || '').toLowerCase().includes(search);
      const noteMatch = (s.notes || '').toLowerCase().includes(search);
      const catMatch =
        Array.isArray(s.categories) &&
        s.categories.some((c) => (c || '').toLowerCase() === search);

      return (
        matchStatus &&
        matchCat &&
        (nameMatch ||
          codeMatch ||
          contactMatch ||
          emailMatch ||
          phoneMatch ||
          addressMatch ||
          noteMatch ||
          catMatch)
      );
    });

    // Pure non-mutating sort
    return [...result].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'rating-desc') {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      if (sortBy === 'rating-asc') {
        return (Number(a.rating) || 0) - (Number(b.rating) || 0);
      }
      if (sortBy === 'status') {
        const order = { 'Active': 1, 'Under Review': 2, 'Inactive': 3 };
        return (order[a.status] || 99) - (order[b.status] || 99);
      }
      // 'newest'
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [suppliers, statusFilter, categoryFilter, searchTerm, sortBy]);

  const isFilteringActive =
    searchTerm.trim() !== '' ||
    categoryFilter !== 'All' ||
    statusFilter !== 'All' ||
    sortBy !== 'name-asc';

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setSortBy('name-asc');
  };

  // Modal Handlers
  const handleOpenAdd = () => {
    if (!canCreate) return;
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    if (!canEdit) return;
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
        onNotify?.(`Updated supplier profile "${formData.name}".`, 'success');
      } else {
        await createSupplier(formData);
        onNotify?.(`Added "${formData.name}" to Procurement Directory.`, 'success');
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
      await loadSuppliers();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to save supplier profile.');
    }
  };

  // Safe Delete Handlers
  const handlePromptDelete = (supplier) => {
    if (!canDelete) return;
    setDeletingSupplier(supplier);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSupplier || !canDelete) return;
    setIsDeleting(true);
    try {
      await deleteSupplier(deletingSupplier.id);
      onNotify?.(`Supplier "${deletingSupplier.name}" deleted.`, 'info');
      setDeletingSupplier(null);
      await loadSuppliers();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to delete supplier.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (status) => {
    if (status === 'Active') {
      return (
        <span
          className="badge"
          style={{
            background: 'var(--success-light)',
            color: 'var(--success-text)',
            border: '1px solid var(--success-border)'
          }}
        >
          <CheckCircle2 size={11} /> Active
        </span>
      );
    }
    if (status === 'Under Review') {
      return (
        <span
          className="badge"
          style={{
            background: 'var(--warning-light)',
            color: 'var(--warning-text)',
            border: '1px solid var(--warning-border)'
          }}
        >
          <Clock size={11} /> Under Review
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{
          background: 'var(--bg-surface-secondary)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-default)'
        }}
      >
        {status || 'Inactive'}
      </span>
    );
  };

  const renderRatingStars = (rating) => {
    const score = Math.max(1, Math.min(5, Number(rating) || 5));
    return (
      <div
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        title={`${score} / 5 Rating`}
        aria-label={`${score} out of 5 stars`}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
          {score.toFixed(1)}
        </span>
        <div style={{ display: 'inline-flex', gap: '1.5px', color: '#f59e0b' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={12}
              fill={star <= score ? '#f59e0b' : 'none'}
              stroke="#f59e0b"
            />
          ))}
        </div>
      </div>
    );
  };

  if (!canRead) {
    return (
      <section className="card" id="suppliers" aria-label="Procurement Supplier Directory">
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="empty-state-icon">
            <Building2 size={26} color="var(--danger)" />
          </div>
          <b>Access Restricted</b>
          <p>You do not have permission to view the Procurement Supplier Directory.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card" id="suppliers" aria-label="Procurement Supplier Directory">
      {/* Module Header */}
      <div className="card-header">
        <div>
          <h2>
            <Truck size={20} color="var(--primary)" />
            Procurement Supplier Directory
          </h2>
          <p>
            Master registry of approved printing houses, merchandise fabricators, POSM production vendors, and agency partners.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadSuppliers}
            title="Refresh directory from repository"
            disabled={loading}
            aria-label="Refresh supplier directory"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
              title="Add a new procurement supplier"
              aria-label="Add a new supplier"
            >
              <Plus size={15} /> Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Supplier Summary Metrics Bar */}
      <div className="sub-summary-bar">
        <div className="sub-summary-item">
          <Building2 size={14} className="sub-summary-icon" />
          <span>
            <b>{metrics.total}</b> Supplier{metrics.total === 1 ? '' : 's'}
          </span>
        </div>

        <div className="sub-summary-item">
          <CheckCircle2 size={14} className="sub-summary-icon success" />
          <span>
            <b>{metrics.active}</b> Active Vendor{metrics.active === 1 ? '' : 's'}
          </span>
        </div>

        {metrics.underReview > 0 && (
          <div className="sub-summary-item">
            <Clock size={14} style={{ color: 'var(--warning-text)' }} />
            <span>
              <b>{metrics.underReview}</b> Under Review
            </span>
          </div>
        )}

        <div className="sub-summary-item">
          <Tag size={14} className="sub-summary-icon" />
          <span>
            <b>{metrics.categoryCount}</b> Categor{metrics.categoryCount === 1 ? 'y' : 'ies'}
          </span>
        </div>

        {isFilteringActive && (
          <div className="sub-summary-item">
            <Filter size={14} className="sub-summary-icon cost" />
            <span>
              <b>{processedSuppliers.length}</b> Matching Filters
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
            placeholder="Search suppliers by name, code, contact person, phone, or services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search suppliers"
          />
        </div>

        <div className="select-input-wrap">
          <Tag size={14} className="filter-input-icon" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by service category"
            style={{ minWidth: '170px' }}
          >
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="select-input-wrap">
          <Filter size={14} className="filter-input-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            style={{ minWidth: '145px' }}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Under Review">Under Review</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="select-input-wrap">
          <ArrowUpDown size={14} className="filter-input-icon" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort supplier directory"
            style={{ minWidth: '165px' }}
          >
            <option value="name-asc">Sort: Name (A to Z)</option>
            <option value="name-desc">Sort: Name (Z to A)</option>
            <option value="rating-desc">Sort: Highest Rating</option>
            <option value="rating-asc">Sort: Lowest Rating</option>
            <option value="status">Sort: Status (Active First)</option>
            <option value="newest">Sort: Recently Added</option>
          </select>
        </div>

        {isFilteringActive && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleResetFilters}
            title="Clear all active search and filter constraints"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={12} /> Reset ({processedSuppliers.length}/{suppliers.length})
          </button>
        )}
      </div>

      {/* Category Quick-Select Pills */}
      {uniqueCategories.length > 2 && (
        <div
          className="asset-category-pills"
          role="tablist"
          aria-label="Category quick filter pills"
          style={{ marginBottom: '16px' }}
        >
          {uniqueCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={categoryFilter === cat}
              className={`asset-cat-btn ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Directory Table / Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '54px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
          <p style={{ fontSize: '13px' }}>Loading procurement suppliers registry...</p>
        </div>
      ) : processedSuppliers.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="empty-state-icon">
            <Building2 size={26} color="var(--primary)" />
          </div>
          <b>No suppliers found</b>
          <p>
            {isFilteringActive
              ? 'No procurement suppliers match your search and filter criteria.'
              : 'No procurement suppliers registered in the directory yet.'}
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
          ) : canCreate ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ marginTop: '8px' }}
            >
              <Plus size={14} /> Add First Supplier
            </button>
          ) : null}
        </div>
      ) : (
        <div className="table-container">
          <table className="table" aria-label="Supplier Directory Table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '25%' }}>Vendor / Company</th>
                <th scope="col" style={{ width: '22%' }}>Service Categories</th>
                <th scope="col" style={{ width: '20%' }}>Contact Person & Info</th>
                <th scope="col" style={{ width: '15%' }}>Location</th>
                <th scope="col" style={{ width: '10%' }}>Rating</th>
                <th scope="col" style={{ width: '8%' }}>Status</th>
                {(canEdit || canDelete) && (
                  <th scope="col" style={{ textAlign: 'right', minWidth: '80px' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {processedSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  {/* Vendor Identity */}
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                      {supplier.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                      {supplier.code ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--bg-surface-secondary)',
                            color: 'var(--text-secondary)',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--border-subtle)',
                            fontWeight: 600
                          }}
                        >
                          {supplier.code}
                        </span>
                      ) : null}
                      {supplier.notes && (
                        <span
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title={supplier.notes}
                        >
                          <FileText size={11} /> Terms attached
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Service Categories */}
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {Array.isArray(supplier.categories) && supplier.categories.length > 0 ? (
                        supplier.categories.map((cat, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              background: 'var(--primary-50)',
                              color: 'var(--primary-active)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontWeight: 600,
                              border: '1px solid var(--primary-100)'
                            }}
                          >
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>
                          General Services
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Contact Details */}
                  <td>
                    {supplier.contactPerson && (
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '12.5px',
                          color: 'var(--text-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <UserCheck size={12} color="var(--primary)" />
                        {supplier.contactPerson}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {supplier.phone && (
                        <a
                          href={`tel:${supplier.phone.replace(/\s+/g, '')}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'inherit' }}
                          title={`Call ${supplier.phone}`}
                          aria-label={`Call ${supplier.phone}`}
                        >
                          <Phone size={11} color="var(--text-subtle)" /> {supplier.phone}
                        </a>
                      )}
                      {supplier.email && (
                        <a
                          href={`mailto:${supplier.email}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--primary-hover)', textDecoration: 'none' }}
                          title={`Email ${supplier.email}`}
                          aria-label={`Email ${supplier.email}`}
                        >
                          <Mail size={11} /> {supplier.email}
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Location */}
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {supplier.address ? (
                      <span
                        style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '4px' }}
                        title={supplier.address}
                      >
                        <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-subtle)' }} />
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {supplier.address}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>—</span>
                    )}
                  </td>

                  {/* Performance Rating */}
                  <td>{renderRatingStars(supplier.rating)}</td>

                  {/* Status Badge */}
                  <td>{renderStatusBadge(supplier.status)}</td>

                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {canEdit && (
                          <button
                            type="button"
                            className="action-btn action-edit"
                            onClick={() => handleOpenEdit(supplier)}
                            title={`Edit ${supplier.name}`}
                            aria-label={`Edit ${supplier.name}`}
                          >
                            <Edit size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="action-btn action-delete"
                            onClick={() => handlePromptDelete(supplier)}
                            title={`Delete ${supplier.name}`}
                            aria-label={`Delete ${supplier.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplier Modal (Create / Edit) */}
      {isModalOpen && (
        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSupplier(null);
          }}
          onSave={handleSave}
          supplier={editingSupplier}
        />
      )}

      {/* Safe Delete Confirmation Dialog */}
      {deletingSupplier && (
        <div className="modal-overlay" onClick={() => !isDeleting && setDeletingSupplier(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            style={{ maxWidth: '480px' }}
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
                  <h3 id="delete-dialog-title" style={{ fontSize: '16px' }}>Confirm Permanent Deletion</h3>
                  <p style={{ fontSize: '12.5px' }}>This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently remove supplier{' '}
              <b style={{ color: 'var(--text-primary)' }}>"{deletingSupplier.name}"</b>
              {deletingSupplier.code ? ` (${deletingSupplier.code})` : ''} from the active procurement registry?
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeletingSupplier(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Error Dialog */}
      <ErrorDialog
        isOpen={Boolean(errorMessage)}
        title="Supplier Directory Alert"
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </section>
  );
}

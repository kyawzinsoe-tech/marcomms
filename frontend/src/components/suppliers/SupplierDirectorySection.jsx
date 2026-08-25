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
  FolderOpen,
  CheckCircle2,
  Clock,
  XCircle,
  Truck
} from 'lucide-react';
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../../services/supplierService';
import { PERMISSIONS, hasPermission } from '../../config/rbac';
import { SupplierModal } from './SupplierModal';

export function SupplierDirectorySection({ user, onNotify }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // RBAC Permission checks
  const canWrite = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.SUPPLIER_CREATE);
  }, [user]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.SUPPLIER_DELETE);
  }, [user]);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError(err.message || 'Failed to load supplier directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Extract unique categories for filter options
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    suppliers.forEach((s) => {
      if (Array.isArray(s.categories)) {
        s.categories.forEach((c) => set.add(c));
      }
    });
    return ['All', ...Array.from(set)];
  }, [suppliers]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchCat =
        categoryFilter === 'All' ||
        (Array.isArray(s.categories) && s.categories.includes(categoryFilter));

      const search = searchTerm.toLowerCase().trim();
      if (!search) return matchStatus && matchCat;

      const nameMatch = (s.name || '').toLowerCase().includes(search);
      const codeMatch = (s.code || '').toLowerCase().includes(search);
      const contactMatch = (s.contactPerson || '').toLowerCase().includes(search);
      const emailMatch = (s.email || '').toLowerCase().includes(search);
      const phoneMatch = (s.phone || '').toLowerCase().includes(search);
      const noteMatch = (s.notes || '').toLowerCase().includes(search);

      return matchStatus && matchCat && (nameMatch || codeMatch || contactMatch || emailMatch || phoneMatch || noteMatch);
    });
  }, [suppliers, statusFilter, categoryFilter, searchTerm]);

  // Handlers
  const handleOpenAdd = () => {
    if (!canWrite) return;
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    if (!canWrite) return;
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
      onNotify?.(err.message || 'Failed to save supplier profile.', 'error');
    }
  };

  const handleDelete = async (supplier) => {
    if (!canDelete) return;
    if (window.confirm(`Permanently remove supplier "${supplier.name}" from the directory?`)) {
      try {
        await deleteSupplier(supplier.id);
        onNotify?.(`Supplier "${supplier.name}" deleted.`, 'info');
        await loadSuppliers();
      } catch (err) {
        onNotify?.(err.message || 'Failed to delete supplier.', 'error');
      }
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
            border: '1px solid #a7f3d0'
          }}
        >
          Active
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
            border: '1px solid #fde68a'
          }}
        >
          Under Review
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{
          background: '#f1f5f9',
          color: '#64748b',
          border: '1px solid #cbd5e1'
        }}
      >
        {status || 'Inactive'}
      </span>
    );
  };

  const renderRatingStars = (rating) => {
    const score = Math.max(1, Math.min(5, Number(rating) || 5));
    return (
      <div style={{ display: 'inline-flex', gap: '2px', color: '#f59e0b' }} title={`${score} / 5 Rating`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={13}
            fill={star <= score ? '#f59e0b' : 'none'}
            stroke="#f59e0b"
          />
        ))}
      </div>
    );
  };

  return (
    <section className="card" id="suppliers">
      <div className="card-header">
        <div>
          <h2>
            <Truck size={20} color="#6366f1" />
            Procurement Supplier Directory
          </h2>
          <p>
            Master registry of approved printing houses, merchandise fabricators, POSM production vendors, and agency partners.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadSuppliers}
            title="Refresh directory"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {canWrite && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
            >
              <Plus size={16} /> Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
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
            placeholder="Search suppliers by name, code, contact person, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
              fontSize: '13px'
            }}
          >
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
              fontSize: '13px'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Under Review">Under Review</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading procurement suppliers...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
          <b>Unable to load suppliers:</b> {error}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-state-icon">
            <Building2 size={28} color="#6366f1" />
          </div>
          <b>No suppliers found</b>
          <p>
            {searchTerm || categoryFilter !== 'All' || statusFilter !== 'All'
              ? 'No suppliers match the current search filters.'
              : 'No procurement suppliers registered yet.'}
          </p>
          {canWrite && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ marginTop: '12px' }}
            >
              <Plus size={14} /> Add First Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Vendor / Company</th>
                <th>Categories</th>
                <th>Contact Details</th>
                <th>Location</th>
                <th>Rating</th>
                <th>Status</th>
                {(canWrite || canDelete) && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{supplier.name}</div>
                    {supplier.code && (
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                        {supplier.code}
                      </div>
                    )}
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                      {Array.isArray(supplier.categories) && supplier.categories.length > 0 ? (
                        supplier.categories.map((cat, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              background: '#eef2ff',
                              color: '#4338ca',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                              fontWeight: 500
                            }}
                          >
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>General</span>
                      )}
                    </div>
                  </td>

                  <td>
                    {supplier.contactPerson && (
                      <div style={{ fontWeight: 500, fontSize: '12.5px', color: '#334155' }}>
                        {supplier.contactPerson}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      {supplier.phone && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={11} /> {supplier.phone}
                        </span>
                      )}
                      {supplier.email && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={11} /> {supplier.email}
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ fontSize: '12.5px', color: '#475569', maxWidth: '200px' }}>
                    {supplier.address ? (
                      <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '4px' }}>
                        <MapPin size={12} style={{ flexShrink: 0, marginTop: '2px', color: '#94a3b8' }} />
                        {supplier.address}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  <td>{renderRatingStars(supplier.rating)}</td>

                  <td>{renderStatusBadge(supplier.status)}</td>

                  {(canWrite || canDelete) && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {canWrite && (
                          <button
                            type="button"
                            className="action-btn action-edit"
                            onClick={() => handleOpenEdit(supplier)}
                            title="Edit supplier profile"
                          >
                            <Edit size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="action-btn action-delete"
                            onClick={() => handleDelete(supplier)}
                            title="Delete supplier"
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

      {/* Supplier Modal */}
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
    </section>
  );
}

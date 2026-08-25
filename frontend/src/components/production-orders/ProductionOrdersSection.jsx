import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Printer,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Building,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import {
  fetchProductionOrders,
  createProductionOrder,
  updateProductionOrder,
  deleteProductionOrder,
  PRODUCTION_STATUSES
} from '../../services/productionOrderService';
import { fetchSuppliers } from '../../services/supplierService';
import { fetchAssets } from '../../services/assetService';
import { PERMISSIONS, hasPermission } from '../../config/rbac';
import { ProductionOrderModal } from './ProductionOrderModal';

export function ProductionOrdersSection({ user, onNotify }) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // RBAC Permission checks
  const canWrite = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_CREATE);
  }, [user]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_UPDATE);
  }, [user]);

  const canDelete = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_DELETE);
  }, [user]);

  const canApproveProof = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_APPROVE_PROOF);
  }, [user]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, supplierData, assetData] = await Promise.all([
        fetchProductionOrders().catch(() => []),
        fetchSuppliers().catch(() => []),
        fetchAssets().catch(() => [])
      ]);
      setOrders(orderData);
      setSuppliers(supplierData);
      setAssets(assetData);
    } catch (err) {
      console.error('Error loading production order matrix:', err);
      setError(err.message || 'Failed to load production orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = statusFilter === 'All' || order.status === statusFilter;
      const matchSupplier =
        supplierFilter === 'All' ||
        (order.supplier && (order.supplier.id === supplierFilter || order.supplier.name === supplierFilter));

      const search = searchTerm.toLowerCase().trim();
      if (!search) return matchStatus && matchSupplier;

      const orderNoMatch = (order.orderNumber || '').toLowerCase().includes(search);
      const campaignMatch = (order.campaignName || '').toLowerCase().includes(search);
      const itemMatch = (order.itemDescription || '').toLowerCase().includes(search);
      const specMatch = (order.specification || '').toLowerCase().includes(search);
      const supplierMatch = order.supplier && (order.supplier.name || '').toLowerCase().includes(search);
      const notesMatch = (order.notes || '').toLowerCase().includes(search);

      return matchStatus && matchSupplier && (orderNoMatch || campaignMatch || itemMatch || specMatch || supplierMatch || notesMatch);
    });
  }, [orders, statusFilter, supplierFilter, searchTerm]);

  // Handlers
  const handleOpenAdd = () => {
    if (!canWrite) return;
    setEditingOrder(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (order) => {
    if (!canEdit) return;
    setEditingOrder(order);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingOrder) {
        await updateProductionOrder(editingOrder.id, formData);
        onNotify?.(`Updated production order "${formData.campaignName}".`, 'success');
      } else {
        await createProductionOrder(formData);
        onNotify?.(`Placed production order "${formData.campaignName}".`, 'success');
      }
      setIsModalOpen(false);
      setEditingOrder(null);
      await loadAllData();
    } catch (err) {
      onNotify?.(err.message || 'Failed to save production order.', 'error');
    }
  };

  const handleQuickApproveProof = async (order) => {
    if (!canApproveProof) return;
    try {
      await updateProductionOrder(order.id, { approveProof: true });
      onNotify?.(`Sample proof signed off for "${order.campaignName}".`, 'success');
      await loadAllData();
    } catch (err) {
      onNotify?.(err.message || 'Failed to sign off proof.', 'error');
    }
  };

  const handleDelete = async (order) => {
    if (!canDelete) return;
    if (window.confirm(`Permanently delete production order "${order.orderNumber}"?`)) {
      try {
        await deleteProductionOrder(order.id);
        onNotify?.(`Production order "${order.orderNumber}" deleted.`, 'info');
        await loadAllData();
      } catch (err) {
        onNotify?.(err.message || 'Failed to delete order.', 'error');
      }
    }
  };

  const renderStatusBadge = (status) => {
    let background = '#f1f5f9';
    let color = '#475569';
    let border = '#cbd5e1';

    if (status === 'Delivered') {
      background = 'var(--success-light)';
      color = 'var(--success-text)';
      border = '#a7f3d0';
    } else if (status === 'In Production') {
      background = '#eff6ff';
      color = '#1d4ed8';
      border = '#bfdbfe';
    } else if (status === 'Sample Proofing') {
      background = 'var(--warning-light)';
      color = 'var(--warning-text)';
      border = '#fde68a';
    } else if (status === 'Submitted') {
      background = '#f5f3ff';
      color = '#6d28d9';
      border = '#ddd6fe';
    } else if (status === 'Cancelled') {
      background = 'var(--danger-light)';
      color = 'var(--danger-text)';
      border = '#fecaca';
    }

    return (
      <span
        className="badge"
        style={{
          background,
          color,
          border: `1px solid ${border}`,
          fontWeight: 600
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <section className="card" id="production-orders">
      <div className="card-header">
        <div>
          <h2>
            <Printer size={20} color="#6366f1" />
            Printing Supplier & Production Order Matrix
          </h2>
          <p>
            Track purchase orders, paper/print specifications, fabrication milestones, and Head of Brand sample proof approvals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadAllData}
            title="Refresh order matrix"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {canWrite && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
            >
              <Plus size={16} /> New Production Order
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
            placeholder="Search by order #, campaign, specifications, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
              fontSize: '13px'
            }}
          >
            <option value="All">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
            {PRODUCTION_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading production order matrix...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>
          <b>Unable to load production orders:</b> {error}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-state-icon">
            <Printer size={28} color="#6366f1" />
          </div>
          <b>No production orders found</b>
          <p>
            {searchTerm || statusFilter !== 'All' || supplierFilter !== 'All'
              ? 'No production orders match the current filter criteria.'
              : 'No printing or production orders placed yet.'}
          </p>
          {canWrite && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              style={{ marginTop: '12px' }}
            >
              <Plus size={14} /> Place First Production Order
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Order # / Date</th>
                <th>Campaign & Item</th>
                <th>Supplier</th>
                <th>Qty & Specs</th>
                <th>Total Cost</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Proof Sign-off</th>
                {(canEdit || canDelete) && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace', fontSize: '13px' }}>
                      {order.orderNumber}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {order.orderDate || '—'}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {order.campaignName}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>
                      {order.itemDescription}
                    </div>
                    {order.assetRef && (
                      <div style={{ marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            background: '#f8fafc',
                            border: '1px solid var(--border-light)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: '#6366f1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Layers size={10} /> {order.assetRef.title}
                        </span>
                      </div>
                    )}
                  </td>

                  <td>
                    {order.supplier ? (
                      <div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{order.supplier.name}</div>
                        {order.supplier.contactPerson && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {order.supplier.contactPerson}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Unassigned</span>
                    )}
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {Number(order.quantity).toLocaleString()} pcs
                    </div>
                    {order.specification && (
                      <div style={{ fontSize: '11.5px', color: '#64748b', maxWidth: '180px', lineHeight: '1.3' }}>
                        {order.specification}
                      </div>
                    )}
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {order.totalCost ? `${Number(order.totalCost).toLocaleString()}` : '—'}
                    </div>
                    {order.unitCost > 0 && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        @{Number(order.unitCost).toLocaleString()} /pc
                      </div>
                    )}
                  </td>

                  <td>
                    {order.deliveryDeadline ? (
                      <span style={{ fontSize: '12px', color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} color="#64748b" /> {order.deliveryDeadline}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  <td>{renderStatusBadge(order.status)}</td>

                  <td>
                    {order.proofApprovedBy ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#f0fdf4',
                          color: '#15803d',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: '1px solid #bbf7d0'
                        }}
                        title={`Approved by ${order.proofApprovedBy.name || order.proofApprovedBy.email}`}
                      >
                        <ShieldCheck size={13} /> Approved
                      </div>
                    ) : canApproveProof ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleQuickApproveProof(order)}
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        <CheckCircle2 size={12} /> Sign-off
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Pending</span>
                    )}
                  </td>

                  {(canEdit || canDelete) && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {canEdit && (
                          <button
                            type="button"
                            className="action-btn action-edit"
                            onClick={() => handleOpenEdit(order)}
                            title="Edit production order"
                          >
                            <Edit size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="action-btn action-delete"
                            onClick={() => handleDelete(order)}
                            title="Delete production order"
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

      {/* Production Order Modal */}
      {isModalOpen && (
        <ProductionOrderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingOrder(null);
          }}
          onSave={handleSave}
          order={editingOrder}
          suppliers={suppliers}
          assets={assets}
          user={user}
        />
      )}
    </section>
  );
}

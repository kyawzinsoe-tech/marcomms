import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Printer,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
  Calendar,
  Layers,
  ShieldCheck,
  Filter,
  ArrowUpDown,
  RotateCcw,
  DollarSign,
  AlertTriangle
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
import { ErrorDialog } from '../common/ErrorDialog';

export function ProductionOrdersSection({ user, onNotify }) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // Safe Delete Confirmation State
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Sign-off Loading State
  const [signingOffId, setSigningOffId] = useState(null);

  // RBAC Permission checks
  const canRead = useMemo(() => {
    if (!user) return false;
    return hasPermission(user, PERMISSIONS.PRODUCTION_ORDER_READ);
  }, [user]);

  const canCreate = useMemo(() => {
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
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
      setErrorMessage(err.message || 'Unable to load production orders from server.');
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Derived Summary Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const inProduction = orders.filter((o) => o.status === 'In Production').length;
    const sampleProofing = orders.filter((o) => o.status === 'Sample Proofing').length;
    const delivered = orders.filter((o) => o.status === 'Delivered').length;
    const totalSpend = orders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.totalCost) || 0), 0);
    return { total, inProduction, sampleProofing, delivered, totalSpend };
  }, [orders]);

  // Filtered & Sorted Orders without mutating original arrays
  const processedOrders = useMemo(() => {
    const result = orders.filter((order) => {
      const matchStatus = statusFilter === 'All' || order.status === statusFilter;
      const matchSupplier =
        supplierFilter === 'All' ||
        (order.supplier &&
          (order.supplier.id === supplierFilter ||
            order.supplier.name === supplierFilter ||
            String(order.supplier) === supplierFilter));

      const search = searchTerm.toLowerCase().trim();
      if (!search) return matchStatus && matchSupplier;

      const orderNoMatch = (order.orderNumber || '').toLowerCase().includes(search);
      const campaignMatch = (order.campaignName || '').toLowerCase().includes(search);
      const itemMatch = (order.itemDescription || '').toLowerCase().includes(search);
      const specMatch = (order.specification || '').toLowerCase().includes(search);
      const supplierMatch =
        order.supplier &&
        ((order.supplier.name || '').toLowerCase().includes(search) ||
          (order.supplier.code || '').toLowerCase().includes(search));
      const assetMatch =
        order.assetRef && (order.assetRef.title || '').toLowerCase().includes(search);
      const notesMatch = (order.notes || '').toLowerCase().includes(search);

      return (
        matchStatus &&
        matchSupplier &&
        (orderNoMatch ||
          campaignMatch ||
          itemMatch ||
          specMatch ||
          supplierMatch ||
          assetMatch ||
          notesMatch)
      );
    });

    // Pure non-mutating sort
    return [...result].sort((a, b) => {
      if (sortBy === 'orderNumber') {
        return (a.orderNumber || '').localeCompare(b.orderNumber || '');
      }
      if (sortBy === 'campaign') {
        return (a.campaignName || '').localeCompare(b.campaignName || '');
      }
      if (sortBy === 'cost-desc') {
        return (Number(b.totalCost) || 0) - (Number(a.totalCost) || 0);
      }
      if (sortBy === 'cost-asc') {
        return (Number(a.totalCost) || 0) - (Number(b.totalCost) || 0);
      }
      if (sortBy === 'deadline') {
        return (a.deliveryDeadline || '9999').localeCompare(b.deliveryDeadline || '9999');
      }
      if (sortBy === 'status') {
        const orderPriority = {
          'Sample Proofing': 1,
          'In Production': 2,
          'Submitted': 3,
          'Draft': 4,
          'Delivered': 5,
          'Cancelled': 6
        };
        return (orderPriority[a.status] || 99) - (orderPriority[b.status] || 99);
      }
      // 'newest'
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [orders, statusFilter, supplierFilter, searchTerm, sortBy]);

  const isFilteringActive =
    searchTerm.trim() !== '' ||
    statusFilter !== 'All' ||
    supplierFilter !== 'All' ||
    sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setSupplierFilter('All');
    setSortBy('newest');
  };

  // Create / Edit Handlers
  const handleOpenAdd = () => {
    if (!canCreate) return;
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
      setErrorMessage(err.message || 'Unable to save production order.');
    }
  };

  // Proof Sign-off Handler
  const handleQuickApproveProof = async (order) => {
    if (!canApproveProof) return;
    setSigningOffId(order.id);
    try {
      await updateProductionOrder(order.id, { approveProof: true });
      onNotify?.(`Sample proof signed off for order "${order.orderNumber}".`, 'success');
      await loadAllData();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to sign off sample proof.');
    } finally {
      setSigningOffId(null);
    }
  };

  // Safe Delete Handlers
  const handlePromptDelete = (order) => {
    if (!canDelete) return;
    setDeletingOrder(order);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrder || !canDelete) return;
    setIsDeleting(true);
    try {
      await deleteProductionOrder(deletingOrder.id);
      onNotify?.(`Production order "${deletingOrder.orderNumber}" deleted.`, 'info');
      setDeletingOrder(null);
      await loadAllData();
    } catch (err) {
      setErrorMessage(err.message || 'Unable to delete production order.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (status) => {
    let background = 'var(--bg-surface-secondary)';
    let color = 'var(--text-secondary)';
    let border = 'var(--border-default)';

    if (status === 'Delivered') {
      background = 'var(--success-light)';
      color = 'var(--success-text)';
      border = 'var(--success-border)';
    } else if (status === 'In Production') {
      background = 'var(--info-light)';
      color = 'var(--info-text)';
      border = 'var(--info-border)';
    } else if (status === 'Sample Proofing') {
      background = 'var(--warning-light)';
      color = 'var(--warning-text)';
      border = 'var(--warning-border)';
    } else if (status === 'Submitted') {
      background = 'var(--primary-50)';
      color = 'var(--primary-active)';
      border = 'var(--primary-200)';
    } else if (status === 'Cancelled') {
      background = 'var(--danger-light)';
      color = 'var(--danger-text)';
      border = 'var(--danger-border)';
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

  if (!canRead) {
    return (
      <section className="card" id="production-orders" aria-label="Production Orders Matrix">
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="empty-state-icon">
            <Printer size={26} color="var(--danger)" />
          </div>
          <b>Access Restricted</b>
          <p>You do not have permission to view the Production Orders Matrix.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card" id="production-orders" aria-label="Printing & Production Order Matrix">
      {/* Module Header */}
      <div className="card-header">
        <div>
          <h2>
            <Printer size={20} color="var(--primary)" />
            Printing Supplier & Production Order Matrix
          </h2>
          <p>
            Track purchase orders, paper/print specifications, fabrication milestones, and Head of Brand sample proof approvals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadAllData}
            title="Refresh order matrix from repository"
            disabled={loading}
            aria-label="Refresh production orders"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
              title="Issue a new printing or production order"
              aria-label="New production order"
            >
              <Plus size={15} /> New Production Order
            </button>
          )}
        </div>
      </div>

      {/* Production Order Summary Metrics Bar */}
      <div className="sub-summary-bar">
        <div className="sub-summary-item">
          <Printer size={14} className="sub-summary-icon" />
          <span>
            <b>{metrics.total}</b> Production Order{metrics.total === 1 ? '' : 's'}
          </span>
        </div>

        <div className="sub-summary-item">
          <Clock size={14} style={{ color: 'var(--info-text)' }} />
          <span>
            <b>{metrics.inProduction}</b> In Production
          </span>
        </div>

        {metrics.sampleProofing > 0 && (
          <div className="sub-summary-item">
            <ShieldCheck size={14} style={{ color: 'var(--warning-text)' }} />
            <span>
              <b>{metrics.sampleProofing}</b> Sample Proofing
            </span>
          </div>
        )}

        <div className="sub-summary-item">
          <CheckCircle2 size={14} className="sub-summary-icon success" />
          <span>
            <b>{metrics.delivered}</b> Delivered
          </span>
        </div>

        {metrics.totalSpend > 0 && (
          <div className="sub-summary-item">
            <DollarSign size={14} className="sub-summary-icon cost" />
            <span>
              <b>{metrics.totalSpend.toLocaleString()}</b> Total Value
            </span>
          </div>
        )}

        {isFilteringActive && (
          <div className="sub-summary-item">
            <Filter size={14} className="sub-summary-icon cost" />
            <span>
              <b>{processedOrders.length}</b> Matching Filters
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
            placeholder="Search by order #, campaign, specifications, vendor, or asset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search production orders"
          />
        </div>

        <div className="select-input-wrap">
          <Building2 size={14} className="filter-input-icon" />
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            aria-label="Filter by supplier"
            style={{ minWidth: '180px' }}
          >
            <option value="All">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="select-input-wrap">
          <Filter size={14} className="filter-input-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by workflow status"
            style={{ minWidth: '160px' }}
          >
            <option value="All">All Statuses</option>
            {PRODUCTION_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="select-input-wrap">
          <ArrowUpDown size={14} className="filter-input-icon" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort production orders"
            style={{ minWidth: '175px' }}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="orderNumber">Sort: Order # (PO-xxx)</option>
            <option value="campaign">Sort: Campaign Title (A-Z)</option>
            <option value="cost-desc">Sort: Highest Cost</option>
            <option value="cost-asc">Sort: Lowest Cost</option>
            <option value="deadline">Sort: Delivery Deadline</option>
            <option value="status">Sort: Workflow Status</option>
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
            <RotateCcw size={12} /> Reset ({processedOrders.length}/{orders.length})
          </button>
        )}
      </div>

      {/* Matrix Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '54px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
          <p style={{ fontSize: '13px' }}>Loading production order matrix...</p>
        </div>
      ) : processedOrders.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 20px' }}>
          <div className="empty-state-icon">
            <Printer size={26} color="var(--primary)" />
          </div>
          <b>No production orders found</b>
          <p>
            {isFilteringActive
              ? 'No production orders match the current search and filter criteria.'
              : 'No printing or production orders have been issued yet.'}
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
              <Plus size={14} /> Place First Production Order
            </button>
          ) : null}
        </div>
      ) : (
        <div className="table-container">
          <table className="table" aria-label="Production Orders Matrix Table">
            <thead>
              <tr>
                <th scope="col" style={{ width: '14%' }}>Order # / Date</th>
                <th scope="col" style={{ width: '22%' }}>Campaign & Item</th>
                <th scope="col" style={{ width: '16%' }}>Supplier</th>
                <th scope="col" style={{ width: '14%' }}>Qty & Specs</th>
                <th scope="col" style={{ width: '11%' }}>Total Cost</th>
                <th scope="col" style={{ width: '9%' }}>Deadline</th>
                <th scope="col" style={{ width: '8%' }}>Status</th>
                <th scope="col" style={{ width: '6%' }}>Proof Sign-off</th>
                {(canEdit || canDelete) && (
                  <th scope="col" style={{ textAlign: 'right', minWidth: '80px' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {processedOrders.map((order) => (
                <tr key={order.id}>
                  {/* Order Number & Date */}
                  <td>
                    <div
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12.5px'
                      }}
                    >
                      {order.orderNumber}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {order.orderDate || '—'}
                    </div>
                  </td>

                  {/* Campaign & Item */}
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                      {order.campaignName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {order.itemDescription}
                    </div>
                    {order.assetRef && (
                      <div style={{ marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            background: 'var(--primary-50)',
                            border: '1px solid var(--primary-100)',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-xs)',
                            color: 'var(--primary-active)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: 600
                          }}
                        >
                          <Layers size={10} /> {order.assetRef.title}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Supplier */}
                  <td>
                    {order.supplier ? (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                          {order.supplier.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {order.supplier.contactPerson || (order.supplier.code ? `Code: ${order.supplier.code}` : '')}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>Unassigned</span>
                    )}
                  </td>

                  {/* Qty & Specs */}
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(order.quantity || 0).toLocaleString()} pcs
                    </div>
                    {order.specification && (
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--text-muted)',
                          maxWidth: '190px',
                          lineHeight: '1.3',
                          marginTop: '2px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                        title={order.specification}
                      >
                        {order.specification}
                      </div>
                    )}
                  </td>

                  {/* Financials */}
                  <td>
                    <div
                      style={{
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {order.totalCost ? Number(order.totalCost).toLocaleString() : '—'}
                    </div>
                    {order.unitCost > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        @{Number(order.unitCost).toLocaleString()} /pc
                      </div>
                    )}
                  </td>

                  {/* Delivery Deadline */}
                  <td>
                    {order.deliveryDeadline ? (
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Calendar size={11} style={{ color: 'var(--text-subtle)' }} /> {order.deliveryDeadline}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>—</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td>{renderStatusBadge(order.status)}</td>

                  {/* Proof Sign-off */}
                  <td>
                    {order.proofApprovedBy ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'var(--success-light)',
                          color: 'var(--success-text)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: '1px solid var(--success-border)',
                          whiteSpace: 'nowrap'
                        }}
                        title={`Approved by ${order.proofApprovedBy.name || order.proofApprovedBy.email}${
                          order.proofApprovedAt ? ` on ${new Date(order.proofApprovedAt).toLocaleDateString()}` : ''
                        }`}
                      >
                        <ShieldCheck size={12} /> Approved
                      </div>
                    ) : canApproveProof ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleQuickApproveProof(order)}
                        disabled={signingOffId === order.id}
                        style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
                        title="Sign off sample proof for this order"
                        aria-label={`Sign off sample proof for order ${order.orderNumber}`}
                      >
                        <CheckCircle2 size={11} className={signingOffId === order.id ? 'animate-spin' : ''} /> Sign-off
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {canEdit && (
                          <button
                            type="button"
                            className="action-btn action-edit"
                            onClick={() => handleOpenEdit(order)}
                            title={`Edit order ${order.orderNumber}`}
                            aria-label={`Edit order ${order.orderNumber}`}
                          >
                            <Edit size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="action-btn action-delete"
                            onClick={() => handlePromptDelete(order)}
                            title={`Delete order ${order.orderNumber}`}
                            aria-label={`Delete order ${order.orderNumber}`}
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

      {/* Production Order Modal (Create / Edit) */}
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

      {/* Safe Delete Confirmation Dialog */}
      {deletingOrder && (
        <div className="modal-overlay" onClick={() => !isDeleting && setDeletingOrder(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-order-dialog-title"
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
                  <h3 id="delete-order-dialog-title" style={{ fontSize: '16px' }}>Confirm Permanent Deletion</h3>
                  <p style={{ fontSize: '12.5px' }}>This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete production order{' '}
              <b style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                "{deletingOrder.orderNumber}"
              </b>{' '}
              ({deletingOrder.campaignName})?
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeletingOrder(null)}
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
                {isDeleting ? 'Deleting...' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Error Dialog */}
      <ErrorDialog
        isOpen={Boolean(errorMessage)}
        title="Production Order Alert"
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
    </section>
  );
}

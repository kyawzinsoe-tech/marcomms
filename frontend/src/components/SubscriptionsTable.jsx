import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit,
  Archive,
  Trash2,
  Layers,
  Filter,
  CheckCircle2,
  DollarSign,
  RotateCcw,
  Download,
  AlertTriangle
} from 'lucide-react';
import { formatDate, formatMoney, formatNumber } from '../utils/formatters';
import { exportSubscriptionsToCsv } from '../utils/exportCsv';

export function SubscriptionsTable({
  subscriptions = [],
  isAdmin = true,
  onAddSubscription,
  onEditSubscription,
  onArchiveSubscription,
  onDeleteSubscription
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');

  // Confirmation modal states
  const [pendingArchiveSub, setPendingArchiveSub] = useState(null);
  const [pendingDeleteSub, setPendingDeleteSub] = useState(null);

  // Compute portfolio metrics
  const activeCount = useMemo(() => subscriptions.filter((s) => s.status === 'Active').length, [subscriptions]);
  const knownMonthlyCost = useMemo(() => {
    return subscriptions
      .filter((s) => s.status === 'Active' && s.plan === 'Monthly' && s.cost !== '' && !isNaN(Number(s.cost)))
      .reduce((sum, s) => sum + Number(s.cost), 0);
  }, [subscriptions]);

  const filtered = useMemo(() => {
    return subscriptions.filter((sub) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        sub.product.toLowerCase().includes(q) ||
        (sub.tool && sub.tool.toLowerCase().includes(q)) ||
        (sub.email && sub.email.toLowerCase().includes(q)) ||
        (sub.purchaseNote && sub.purchaseNote.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'All' || sub.status === statusFilter;

      const matchPlan =
        planFilter === 'All' || sub.plan === planFilter;

      return matchSearch && matchStatus && matchPlan;
    });
  }, [subscriptions, searchTerm, statusFilter, planFilter]);

  const isFilteringActive = searchTerm.trim() !== '' || statusFilter !== 'All' || planFilter !== 'All';

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setPlanFilter('All');
  };

  const handleExportCsv = () => {
    const targetData = isFilteringActive ? filtered : subscriptions;
    exportSubscriptionsToCsv(targetData);
  };

  const handleConfirmArchive = () => {
    if (!pendingArchiveSub) return;
    onArchiveSubscription(pendingArchiveSub.id);
    setPendingArchiveSub(null);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteSub) return;
    onDeleteSubscription(pendingDeleteSub.id);
    setPendingDeleteSub(null);
  };

  return (
    <section className="card" id="subscriptions" aria-label="Subscription Overview Management">
      <div className="card-header">
        <div>
          <h2>
            <Layers size={18} color="#6366f1" />
            Subscription Overview
          </h2>
          <p>
            {isAdmin
              ? 'Manage creative tool subscriptions, plans, renewal schedules, and Magnific token allocations.'
              : 'Overview of active creative tools, billing plans, and associated accounts.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCsv}
            title="Export subscriptions to CSV file"
            aria-label="Export subscriptions CSV"
          >
            <Download size={14} /> Export CSV
          </button>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddSubscription}
              title="Create a new subscription license record"
            >
              <Plus size={15} /> Add Subscription
            </button>
          )}
        </div>
      </div>

      {/* Subscription Summary Bar */}
      <div className="sub-summary-bar">
        <div className="sub-summary-item">
          <Layers size={14} className="sub-summary-icon" />
          <span><b>{subscriptions.length}</b> Total Licenses</span>
        </div>
        <div className="sub-summary-item">
          <CheckCircle2 size={14} className="sub-summary-icon success" />
          <span><b>{activeCount}</b> Active Plans</span>
        </div>
        <div className="sub-summary-item">
          <DollarSign size={14} className="sub-summary-icon cost" />
          <span><b>{formatMoney(knownMonthlyCost)}</b>/mo Active Cost</span>
        </div>
      </div>

      {/* Multi-Filter Controls */}
      <div className="table-filter-bar">
        <div className="search-input-wrap">
          <Search
            size={15}
            className="search-input-icon"
          />
          <input
            type="text"
            placeholder="Search by product, tool, email, or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search subscriptions"
          />
        </div>

        <div className="select-input-wrap">
          <Filter size={14} className="filter-input-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by subscription status"
          >
            <option value="All">All Statuses ({subscriptions.length})</option>
            <option value="Active">Active ({activeCount})</option>
            <option value="Inactive">Inactive ({subscriptions.length - activeCount})</option>
          </select>
        </div>

        <div className="select-input-wrap">
          <Filter size={14} className="filter-input-icon" />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            aria-label="Filter by subscription plan"
          >
            <option value="All">All Plans</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="Lifetime">Lifetime</option>
            <option value="Free">Free</option>
          </select>
        </div>

        {isFilteringActive && (
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={handleResetFilters}
            title="Clear active search and status filters"
          >
            <RotateCcw size={13} /> Reset ({filtered.length}/{subscriptions.length})
          </button>
        )}
      </div>

      {/* Subscription Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th scope="col" style={{ width: '18%' }}>Product</th>
              <th scope="col" style={{ width: '18%' }}>Tool / Service</th>
              <th scope="col" style={{ width: '11%' }}>Plan</th>
              <th scope="col" style={{ width: '11%' }}>Status</th>
              <th scope="col" style={{ width: '14%' }}>Expiry Date</th>
              <th scope="col" style={{ width: '12%' }}>Cost (USD)</th>
              <th scope="col" style={{ width: '16%' }}>Account</th>
              {isAdmin && (
                <th scope="col" style={{ width: '12%', textAlign: 'center' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 8 : 7}
                  style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}
                >
                  <Layers size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <div>No subscription records matching your filter criteria.</div>
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sub.product}
                    </div>
                    {sub.initialTokens && (
                      <span className="badge badge-indigo" style={{ marginTop: '3px' }}>
                        {formatNumber(sub.initialTokens)} Tokens
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-secondary)' }}>{sub.tool || '—'}</div>
                  </td>
                  <td>
                    <span className={`badge ${sub.plan === 'Yearly' ? 'badge-primary' : 'badge-blue'}`}>
                      {sub.plan}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill status-${sub.status.toLowerCase()}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{formatDate(sub.expiry)}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {sub.cost !== '' && !isNaN(Number(sub.cost)) ? formatMoney(sub.cost) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                    {sub.email || '—'}
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="action-btn action-edit"
                          title={`Edit ${sub.product} subscription`}
                          onClick={() => onEditSubscription(sub)}
                          aria-label={`Edit ${sub.product}`}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-archive"
                          title={`Archive ${sub.product} from dashboard`}
                          onClick={() => setPendingArchiveSub(sub)}
                          aria-label={`Archive ${sub.product}`}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-delete"
                          title={`Delete ${sub.product} permanently`}
                          onClick={() => setPendingDeleteSub(sub)}
                          aria-label={`Delete ${sub.product}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Safe Archive Confirmation Modal */}
      {pendingArchiveSub && (
        <div className="modal-overlay" onClick={() => setPendingArchiveSub(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-sub-title"
            style={{ maxWidth: '460px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--warning-light)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--warning-text)',
                    flexShrink: 0
                  }}
                >
                  <Archive size={18} />
                </div>
                <div>
                  <h3 id="archive-sub-title" style={{ fontSize: '16px' }}>Archive Subscription</h3>
                  <p style={{ fontSize: '12.5px' }}>{pendingArchiveSub.product}</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to archive <b>{pendingArchiveSub.product}</b>? It will be hidden from the active overview table but securely preserved in database backups.
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPendingArchiveSub(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={handleConfirmArchive}
              >
                Archive Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation Modal */}
      {pendingDeleteSub && (
        <div className="modal-overlay" onClick={() => setPendingDeleteSub(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-sub-title"
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
                  <h3 id="delete-sub-title" style={{ fontSize: '16px' }}>Permanently Delete Subscription</h3>
                  <p style={{ fontSize: '12.5px' }}>{pendingDeleteSub.product}</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete the subscription for <b>{pendingDeleteSub.product}</b>? This action cannot be undone.
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPendingDeleteSub(null)}
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
    </section>
  );
}

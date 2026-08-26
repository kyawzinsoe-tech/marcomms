import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Archive, Trash2, Layers, Filter, CheckCircle2, DollarSign, RotateCcw } from 'lucide-react';
import { formatDate, formatMoney, formatNumber } from '../utils/formatters';

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

  const handleArchive = (sub) => {
    if (
      window.confirm(
        `Archive subscription for "${sub.product}"?\n\nIt will be hidden from the active overview table but securely preserved in backups.`
      )
    ) {
      onArchiveSubscription(sub.id);
    }
  };

  const handleDelete = (sub) => {
    if (
      window.confirm(
        `Are you sure you want to PERMANENTLY DELETE subscription for "${sub.product}"?\n\nThis cannot be undone.`
      )
    ) {
      onDeleteSubscription(sub.id);
    }
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
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            aria-label="Filter by billing plan"
            style={{ minWidth: '135px' }}
          >
            <option value="All">All Plans</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="Pay As You Go">Pay As You Go</option>
            <option value="Other">Other</option>
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
            <RotateCcw size={12} /> Reset ({filtered.length}/{subscriptions.length})
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Tool / Service</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>Expiry Date</th>
              <th style={{ textAlign: 'right' }}>Cost (USD)</th>
              <th style={{ textAlign: 'right' }}>Initial Tokens</th>
              <th>Account</th>
              {isAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <div className="empty-state" style={{ padding: '8px' }}>
                    <b>No subscriptions found</b>
                    <p>
                      {subscriptions.length === 0
                        ? 'No subscription records available. Click "Add Subscription" to create one.'
                        : 'No subscriptions match your search and filter criteria.'}
                    </p>
                    {isFilteringActive && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleResetFilters}
                        style={{ marginTop: '8px' }}
                      >
                        <RotateCcw size={13} /> Reset Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{sub.product}</strong>
                  </td>
                  <td>{sub.tool || '—'}</td>
                  <td>
                    <span className="plan-tag">{sub.plan || 'Monthly'}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        sub.status === 'Active' ? 'badge-active' : 'badge-inactive'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td>{formatDate(sub.start)}</td>
                  <td>{formatDate(sub.expiry)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {sub.cost !== '' && sub.cost !== undefined ? formatMoney(sub.cost) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--primary-hover)' }}>
                    {sub.initialTokens !== '' && sub.initialTokens !== undefined ? formatNumber(sub.initialTokens) : '—'}
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
                          onClick={() => handleArchive(sub)}
                          aria-label={`Archive ${sub.product}`}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-delete"
                          title={`Delete ${sub.product} permanently`}
                          onClick={() => handleDelete(sub)}
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
    </section>
  );
}

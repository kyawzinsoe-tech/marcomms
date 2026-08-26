import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Archive, Trash2, Layers, Filter } from 'lucide-react';
import { formatDate, formatMoney, formatNumber } from '../utils/formatters';

export function SubscriptionsTable({
  subscriptions,
  isAdmin = true,
  onAddSubscription,
  onEditSubscription,
  onArchiveSubscription,
  onDeleteSubscription
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchSearch =
        sub.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.tool.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.email && sub.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchStatus =
        statusFilter === 'All' || sub.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  const handleArchive = (sub) => {
    if (
      window.confirm(
        `Remove "${sub.product}" from the active dashboard? (Data is preserved and can be restored from backup)`
      )
    ) {
      onArchiveSubscription(sub.id);
    }
  };

  const handleDelete = (sub) => {
    if (
      window.confirm(
        `Permanently delete subscription for "${sub.product}"? This cannot be undone.`
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
              ? 'Manage plans, renewal schedules, reminder notifications, and Magnific token allotments.'
              : 'Overview of active creative tools, billing intervals, and associated accounts.'}
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

      <div className="table-filter-bar">
        <div className="search-input-wrap">
          <Search
            size={15}
            className="search-input-icon"
          />
          <input
            type="text"
            placeholder="Search subscriptions, tools, or accounts..."
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
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
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
                          title="Edit subscription"
                          onClick={() => onEditSubscription(sub)}
                          aria-label={`Edit ${sub.product}`}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-archive"
                          title="Remove from dashboard (Archive)"
                          onClick={() => handleArchive(sub)}
                          aria-label={`Archive ${sub.product}`}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-delete"
                          title="Delete permanently"
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

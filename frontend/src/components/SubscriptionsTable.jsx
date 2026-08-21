import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Archive, Trash2, Layers } from 'lucide-react';
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
    <section className="card" id="subscriptions">
      <div className="card-header">
        <div>
          <h2>
            <Layers size={20} color="#6366f1" />
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
          >
            <Plus size={16} /> Add Subscription
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
            placeholder="Search subscriptions or accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '150px' }}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>
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
              <th>Cost (USD)</th>
              <th>Initial Tokens</th>
              <th>Account</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '32px' }}>
                  <span style={{ color: '#64748b' }}>
                    {subscriptions.length === 0
                      ? 'No subscriptions available.'
                      : 'No subscriptions match your search filter.'}
                  </span>
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <strong style={{ color: '#0f172a' }}>{sub.product}</strong>
                  </td>
                  <td>{sub.tool || '—'}</td>
                  <td>{sub.plan || '—'}</td>
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
                  <td>{sub.cost !== '' ? formatMoney(sub.cost) : '—'}</td>
                  <td>{sub.initialTokens !== '' ? formatNumber(sub.initialTokens) : '—'}</td>
                  <td style={{ color: '#475569', fontSize: '12.5px' }}>
                    {sub.email || '—'}
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="action-btn action-edit"
                          title="Edit subscription"
                          onClick={() => onEditSubscription(sub)}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-archive"
                          title="Remove from dashboard (Archive)"
                          onClick={() => handleArchive(sub)}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-delete"
                          title="Delete permanently"
                          onClick={() => handleDelete(sub)}
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

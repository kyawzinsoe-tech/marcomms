import React, { useState, useMemo } from 'react';
import { History, Edit, Archive, Trash2, Search, Filter, RotateCcw } from 'lucide-react';
import { formatDate, formatMoney, formatNumber, formatMonthName } from '../utils/formatters';

export function TokenHistoryTable({
  entries = [],
  reportMonth,
  isAdmin = true,
  onEditToken,
  onArchiveToken,
  onDeleteToken
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState('All');

  // Extract unique accounts
  const uniqueAccounts = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => {
      if (e.account && e.account.trim()) {
        set.add(e.account.trim());
      }
    });
    return Array.from(set).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (entry.project && entry.project.toLowerCase().includes(q)) ||
        (entry.account && entry.account.toLowerCase().includes(q)) ||
        (entry.notes && entry.notes.toLowerCase().includes(q));

      const matchAccount =
        accountFilter === 'All' || entry.account === accountFilter;

      return matchSearch && matchAccount;
    });
  }, [entries, searchTerm, accountFilter]);

  const isFilteringActive = searchTerm.trim() !== '' || accountFilter !== 'All';

  const handleResetFilters = () => {
    setSearchTerm('');
    setAccountFilter('All');
  };

  const handleArchive = (tok) => {
    if (
      window.confirm(
        `Archive token entry for "${tok.project}"?\n\nIt will be hidden from the active history table but securely preserved in system backups.`
      )
    ) {
      onArchiveToken(tok.id);
    }
  };

  const handleDelete = (tok) => {
    if (
      window.confirm(
        `Are you sure you want to PERMANENTLY DELETE token entry for "${tok.project}"?\n\nThis cannot be undone.`
      )
    ) {
      onDeleteToken(tok.id);
    }
  };

  return (
    <section className="card" aria-label="Magnific AI Token Entry History">
      <div className="card-header">
        <div>
          <h2>
            <History size={18} color="#6366f1" />
            Magnific AI — Entry History
          </h2>
          <p>
            Detailed transaction history and consumption logs for {formatMonthName(reportMonth)}.
          </p>
        </div>

        <div className="count-pill count-pill-primary">
          {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} logged
        </div>
      </div>

      {/* Filter Bar */}
      <div className="table-filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-input-icon" />
          <input
            type="text"
            placeholder="Search by project, account, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search token usage history"
          />
        </div>

        {uniqueAccounts.length > 0 && (
          <div className="select-input-wrap">
            <Filter size={14} className="filter-input-icon" />
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              aria-label="Filter by account email"
            >
              <option value="All">All Accounts ({entries.length})</option>
              {uniqueAccounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFilteringActive && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleResetFilters}
            title="Clear active filters"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={12} /> Reset ({filteredEntries.length}/{entries.length})
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Project / Usage Description</th>
              <th style={{ textAlign: 'right' }}>Tokens Used</th>
              <th style={{ textAlign: 'right' }}>Estimated Cost</th>
              <th>Notes & Details</th>
              {isAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <div className="empty-state" style={{ padding: '8px' }}>
                    <b>No token entries found</b>
                    <p>
                      {entries.length === 0
                        ? `No token consumption entries recorded for ${formatMonthName(reportMonth)}.`
                        : 'No token entries match your search and filter criteria.'}
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
              filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {formatDate(entry.date)}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                    {entry.account || '—'}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {entry.project || '—'}
                    </strong>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: 'var(--primary-hover)',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {formatNumber(entry.tokens)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#0d9488',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {entry.cost !== undefined && entry.cost !== '' ? formatMoney(entry.cost) : '—'}
                  </td>
                  <td
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      maxWidth: '240px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={entry.notes || ''}
                  >
                    {entry.notes || '—'}
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="action-btn action-edit"
                          title={`Edit entry for ${entry.project}`}
                          onClick={() => onEditToken(entry)}
                          aria-label={`Edit ${entry.project}`}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-archive"
                          title={`Archive entry for ${entry.project}`}
                          onClick={() => handleArchive(entry)}
                          aria-label={`Archive ${entry.project}`}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-delete"
                          title={`Delete entry for ${entry.project} permanently`}
                          onClick={() => handleDelete(entry)}
                          aria-label={`Delete ${entry.project}`}
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

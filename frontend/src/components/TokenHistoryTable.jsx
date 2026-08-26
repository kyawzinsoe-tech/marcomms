import React, { useState, useMemo } from 'react';
import {
  History,
  Edit,
  Archive,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  Download,
  AlertTriangle
} from 'lucide-react';
import { formatDate, formatMoney, formatNumber, formatMonthName } from '../utils/formatters';
import { exportTokenEntriesToCsv } from '../utils/exportCsv';

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

  // Confirmation modal states
  const [pendingArchiveToken, setPendingArchiveToken] = useState(null);
  const [pendingDeleteToken, setPendingDeleteToken] = useState(null);

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

  const handleExportCsv = () => {
    const targetData = isFilteringActive ? filteredEntries : entries;
    exportTokenEntriesToCsv(targetData, `kbz-marcomms-token-usage-${reportMonth || 'all'}.csv`);
  };

  const handleConfirmArchive = () => {
    if (!pendingArchiveToken) return;
    onArchiveToken(pendingArchiveToken.id);
    setPendingArchiveToken(null);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteToken) return;
    onDeleteToken(pendingDeleteToken.id);
    setPendingDeleteToken(null);
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportCsv}
            title="Export token usage logs to CSV file"
            aria-label="Export token usage CSV"
          >
            <Download size={14} /> Export CSV
          </button>

          <div className="count-pill count-pill-primary">
            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} logged
          </div>
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

        <div className="select-input-wrap">
          <Filter size={14} className="filter-input-icon" />
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            aria-label="Filter by account"
          >
            <option value="All">All Accounts ({entries.length})</option>
            {uniqueAccounts.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>

        {isFilteringActive && (
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={handleResetFilters}
            title="Clear active filters"
          >
            <RotateCcw size={13} /> Reset ({filteredEntries.length}/{entries.length})
          </button>
        )}
      </div>

      {/* Token History Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th scope="col" style={{ width: '13%' }}>Date</th>
              <th scope="col" style={{ width: '18%' }}>Account</th>
              <th scope="col" style={{ width: '22%' }}>Project / Usage</th>
              <th scope="col" style={{ width: '14%' }}>Tokens Used</th>
              <th scope="col" style={{ width: '13%' }}>Est. Cost (USD)</th>
              <th scope="col" style={{ width: '18%' }}>Notes</th>
              {isAdmin && (
                <th scope="col" style={{ width: '12%', textAlign: 'center' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}
                >
                  <History size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <div>No token entries recorded for this period.</div>
                </td>
              </tr>
            ) : (
              filteredEntries.map((tok) => (
                <tr key={tok.id}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{formatDate(tok.date)}</span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {tok.account || '—'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tok.project || '—'}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-purple" style={{ fontWeight: 700 }}>
                      {formatNumber(tok.tokens)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {tok.cost !== '' && !isNaN(Number(tok.cost)) ? formatMoney(tok.cost) : '—'}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {tok.notes || '—'}
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      <div className="table-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="action-btn action-edit"
                          title="Edit token entry"
                          onClick={() => onEditToken(tok)}
                          aria-label="Edit token entry"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-archive"
                          title="Archive token entry"
                          onClick={() => setPendingArchiveToken(tok)}
                          aria-label="Archive token entry"
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-delete"
                          title="Delete token entry permanently"
                          onClick={() => setPendingDeleteToken(tok)}
                          aria-label="Delete token entry"
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
      {pendingArchiveToken && (
        <div className="modal-overlay" onClick={() => setPendingArchiveToken(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-token-title"
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
                  <h3 id="archive-token-title" style={{ fontSize: '16px' }}>Archive Token Entry</h3>
                  <p style={{ fontSize: '12.5px' }}>{pendingArchiveToken.project}</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to archive token entry for <b>{pendingArchiveToken.project}</b> ({formatNumber(pendingArchiveToken.tokens)} tokens)? It will be hidden from active logs but preserved in backups.
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPendingArchiveToken(null)}
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
      {pendingDeleteToken && (
        <div className="modal-overlay" onClick={() => setPendingDeleteToken(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-token-title"
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
                  <h3 id="delete-token-title" style={{ fontSize: '16px' }}>Permanently Delete Token Entry</h3>
                  <p style={{ fontSize: '12.5px' }}>{pendingDeleteToken.project}</p>
                </div>
              </div>
            </div>

            <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete the token entry for <b>{pendingDeleteToken.project}</b>? This action cannot be undone.
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPendingDeleteToken(null)}
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

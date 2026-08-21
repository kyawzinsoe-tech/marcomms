import React from 'react';
import { History, Edit, Archive, Trash2 } from 'lucide-react';
import { formatDate, formatMoney, formatNumber, formatMonthName } from '../utils/formatters';

export function TokenHistoryTable({
  entries,
  reportMonth,
  isAdmin = true,
  onEditToken,
  onArchiveToken,
  onDeleteToken
}) {
  const handleArchive = (tok) => {
    if (window.confirm(`Archive token entry for "${tok.project}"?`)) {
      onArchiveToken(tok.id);
    }
  };

  const handleDelete = (tok) => {
    if (window.confirm(`Permanently delete token entry for "${tok.project}"?`)) {
      onDeleteToken(tok.id);
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>
            <History size={20} color="#6366f1" />
            Magnific AI — Entry History
          </h2>
          <p>Usage entries for {formatMonthName(reportMonth)}.</p>
        </div>

        <div className="count-pill count-pill-primary">
          {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Project / Usage</th>
              <th>Tokens Used</th>
              <th>Estimated Cost</th>
              <th>Notes</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No token entries recorded for {formatMonthName(reportMonth)}.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date)}</td>
                  <td style={{ color: '#475569' }}>{entry.account || '—'}</td>
                  <td>
                    <strong>{entry.project || '—'}</strong>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#4f46e5' }}>
                      {formatNumber(entry.tokens)}
                    </span>
                  </td>
                  <td>{entry.cost ? formatMoney(entry.cost) : '—'}</td>
                  <td style={{ color: '#64748b', fontSize: '12.5px' }}>
                    {entry.notes || '—'}
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="action-btn action-edit"
                          title="Edit token entry"
                          onClick={() => onEditToken(entry)}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-archive"
                          title="Archive token entry"
                          onClick={() => handleArchive(entry)}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-delete"
                          title="Delete permanently"
                          onClick={() => handleDelete(entry)}
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

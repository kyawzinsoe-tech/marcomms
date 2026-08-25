export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function calculateDayDiff(isoDateA, isoDateB) {
  if (!isoDateA || !isoDateB) return 0;
  const a = new Date(`${isoDateA}T00:00:00`);
  const b = new Date(`${isoDateB}T00:00:00`);
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Formats ISO date or timestamp into DD MMM YYYY safely.
 * Returns '—' if invalid or missing; never outputs "Invalid Date".
 */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  try {
    const rawStr = String(isoDate).trim();
    if (!rawStr) return '—';

    // If format is strictly YYYY-MM-DD
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawStr)
      ? new Date(`${rawStr}T00:00:00`)
      : new Date(rawStr);

    if (isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

/**
 * Formats a timestamp into human-readable date & time (e.g. 25 Aug 2026, 03:30 PM)
 */
export function formatDateTime(isoDate) {
  if (!isoDate) return '—';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '—';
  }
}

export function formatMonthName(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return '';
  try {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return monthStr;
  }
}

export function formatMoney(amount) {
  const num = Number(amount || 0);
  const hasDecimals = num % 1 !== 0;
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

export function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

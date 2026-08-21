export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function calculateDayDiff(isoDateA, isoDateB) {
  if (!isoDateA || !isoDateB) return 0;
  const a = new Date(`${isoDateA}T00:00:00`);
  const b = new Date(`${isoDateB}T00:00:00`);
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

export function formatDate(isoDate) {
  if (!isoDate) return '—';
  try {
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return isoDate;
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
  return '$' + num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

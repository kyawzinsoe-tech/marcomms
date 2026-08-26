/**
 * RFC-4180 Compliant CSV Export Utilities for KBZ Marcomms Webportal
 * Includes UTF-8 BOM for seamless compatibility with Microsoft Excel & Google Sheets.
 */

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(content, filename) {
  // \uFEFF is UTF-8 Byte Order Mark for Excel
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Subscriptions to CSV
 */
export function exportSubscriptionsToCsv(subscriptions = [], customFilename) {
  const headers = [
    'ID',
    'Product',
    'Tool / Service',
    'Billing Plan',
    'Status',
    'Start Date',
    'Expiry Date',
    'Cost (USD)',
    'Assigned Email',
    'Reminder Email',
    'Alert Days',
    'Initial Tokens',
    'Purchase Note',
    'Archived'
  ];

  const rows = subscriptions.map((s) => [
    s.id || '',
    s.product || '',
    s.tool || '',
    s.plan || '',
    s.status || '',
    s.start || '',
    s.expiry || '',
    s.cost || '',
    s.email || '',
    s.reminderEmail || '',
    s.alertDays ?? 7,
    s.initialTokens || '',
    s.purchaseNote || '',
    s.archived ? 'Yes' : 'No'
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `kbz-marcomms-subscriptions-${dateStr}.csv`;
  downloadCsv(csvContent, filename);
}

/**
 * Export AI Token Usage Entries to CSV
 */
export function exportTokenEntriesToCsv(entries = [], customFilename) {
  const headers = [
    'ID',
    'Date',
    'Account / Email',
    'Project / Usage',
    'Tokens Used',
    'Estimated Cost (USD)',
    'Notes',
    'Archived'
  ];

  const rows = entries.map((t) => [
    t.id || '',
    t.date || '',
    t.account || '',
    t.project || '',
    t.tokens || 0,
    t.cost || '',
    t.notes || '',
    t.archived ? 'Yes' : 'No'
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `kbz-marcomms-token-usage-${dateStr}.csv`;
  downloadCsv(csvContent, filename);
}

/**
 * Export Suppliers Directory to CSV
 */
export function exportSuppliersToCsv(suppliers = [], customFilename) {
  const headers = [
    'ID',
    'Supplier Name',
    'Code',
    'Service Categories',
    'Contact Person',
    'Phone',
    'Email',
    'Address',
    'Rating (1-5)',
    'Status',
    'Notes'
  ];

  const rows = suppliers.map((sup) => [
    sup.id || '',
    sup.name || '',
    sup.code || '',
    Array.isArray(sup.categories) ? sup.categories.join('; ') : (sup.categories || ''),
    sup.contactPerson || '',
    sup.phone || '',
    sup.email || '',
    sup.address || '',
    sup.rating || 5,
    sup.status || '',
    sup.notes || ''
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `kbz-marcomms-suppliers-${dateStr}.csv`;
  downloadCsv(csvContent, filename);
}

/**
 * Export Production Orders Matrix to CSV
 */
export function exportProductionOrdersToCsv(orders = [], customFilename) {
  const headers = [
    'PO Number',
    'Campaign Name',
    'Item Description',
    'Specification',
    'Supplier',
    'Quantity',
    'Unit Cost (MMK)',
    'Total Cost (MMK)',
    'Order Date',
    'Delivery Deadline',
    'Status',
    'Proof Approved At',
    'Notes'
  ];

  const rows = orders.map((o) => [
    o.orderNumber || '',
    o.campaignName || '',
    o.itemDescription || '',
    o.specification || '',
    o.supplier?.name || o.supplierName || '',
    o.quantity || 0,
    o.unitCost || '',
    o.totalCost || '',
    o.orderDate || '',
    o.deliveryDeadline || '',
    o.status || '',
    o.proofApprovedAt || '',
    o.notes || ''
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `kbz-marcomms-production-orders-${dateStr}.csv`;
  downloadCsv(csvContent, filename);
}

/**
 * Export User Management Roster to CSV
 */
export function exportUsersToCsv(users = [], customFilename) {
  const headers = [
    'ID',
    'Full Name',
    'Work Email',
    'Assigned Role',
    'Created At',
    'Last Login'
  ];

  const rows = users.map((u) => [
    u.id || '',
    u.name || '',
    u.email || '',
    u.role || '',
    u.createdAt || '',
    u.lastLogin || ''
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(','))
  ].join('\r\n');

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `kbz-marcomms-user-roster-${dateStr}.csv`;
  downloadCsv(csvContent, filename);
}

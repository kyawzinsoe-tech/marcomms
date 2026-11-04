const unitLabel = value => ({Bank: 'KBZ Bank', Pay: 'KBZPay'})[value] || value;
const specification = item => [...new Set(['specification', 'mainData', 'description'].map(key => item.details?.[key]?.trim()).filter(Boolean))].join(' · ');
const dateText = value => {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

export function propertyExportTable(items, extraColumns = [], labels = {}) {
  const extras = extraColumns.filter(key => key !== 'specification');
  return {
    headers: ['No.', 'Date', 'Name', 'Product Name', 'Business Unit', 'Quantity', 'Condition', 'Owner', 'Specification', ...extras.map(key => labels[key] || key)],
    rows: items.map(item => [
      String(item.propertyNo || ''), dateText(item.date),
      `${item.category} / ${item.itemType === 'Other' ? item.customType : item.itemType}`,
      item.productName || '', unitLabel(item.businessUnit), Number(item.quantity || 0),
      item.condition || '', item.owner || '', specification(item),
      ...extras.map(key => (key === 'note' ? item.note : item.details?.[key]) || '')
    ])
  };
}

export function propertyExcelData(table) {
  return [table.headers.map(value => ({value, fontWeight: 'bold', backgroundColor: '#1E3A5F', textColor: '#FFFFFF'})),
    ...table.rows.map(row => row.map(value => ({value, type: typeof value === 'number' ? Number : String, wrap: true})))];
}

export async function exportPropertiesExcel(table) {
  const {default: writeExcelFile} = await import('write-excel-file/browser');
  await writeExcelFile(propertyExcelData(table), {
    sheet: 'Properties', columns: table.headers.map(header => ({width: ['Product Name', 'Specification', 'Note'].includes(header) ? 40 : header === 'No.' ? 9 : 22}))
  }).toFile(`marcomms-properties-${new Date().toISOString().slice(0,10)}.xlsx`);
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
export function propertyPrintHtml(table, scope) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Marcomms Properties List</title><style>
    @page{size:A4 landscape;margin:12mm}body{font:10px Arial,sans-serif;color:#172033}h1{font-size:20px;margin:0 0 8px}p{margin:5px 0 12px}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{background:#e8eef7}tr{break-inside:avoid}th:first-child,td:first-child{width:35px}
    </style></head><body><h1>Marcomms Properties List</h1><p>${escapeHtml(scope)} · ${table.rows.length} records · Exported ${escapeHtml(new Date().toLocaleDateString())}</p><table><thead><tr>${table.headers.map(header=>`<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map(value=>`<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
}

export function printPropertiesPdf(table, scope) {
  document.getElementById('property-export-frame')?.remove();
  const frame = document.createElement('iframe');
  frame.id = 'property-export-frame';
  frame.title = 'Properties List PDF';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1100px;height:800px;border:0;';
  frame.onload = () => {
    const target = frame.contentWindow;
    target.addEventListener('afterprint', () => frame.remove(), {once:true});
    target.focus();
    target.print();
  };
  frame.srcdoc = propertyPrintHtml(table, scope);
  document.body.appendChild(frame);
}

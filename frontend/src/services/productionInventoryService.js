import { getAuthToken } from './authService';
import { handleApiResponse } from './api';

const headers = (json = false) => ({ Authorization: `Bearer ${getAuthToken()}`, ...(json ? { 'Content-Type': 'application/json' } : {}) });
async function result(response, key) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Production inventory request failed.'); return key ? data[key] : data; }

export async function fetchProductionItems() {
  return result(await fetch('/api/production-inventory', { headers: headers() }).then(handleApiResponse), 'items');
}
export async function createProductionItem(payload) {
  return result(await fetch('/api/production-inventory', { method: 'POST', headers: headers(true), body: JSON.stringify(payload) }).then(handleApiResponse), 'item');
}
export async function uploadProductionItemImage(id, file) {
  if (!['image/png', 'image/jpeg'].includes(file?.type)) throw new Error('Please select a PNG or JPEG image.');
  const response = await fetch(`/api/production-inventory/${id}/image`, { method: 'PUT', headers: { ...headers(), 'Content-Type': file.type, 'X-File-Name': file.name }, body: file }).then(handleApiResponse);
  return result(response, 'item');
}
export async function addStockMovement(id, payload) {
  return result(await fetch(`/api/production-inventory/${id}/movements`, { method: 'POST', headers: headers(true), body: JSON.stringify(payload) }).then(handleApiResponse), 'item');
}

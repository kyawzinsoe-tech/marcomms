import { getAuthToken } from './authService';
import { handleApiResponse } from './api';

const headers = () => ({ Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' });
async function unwrap(response, key) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Property request failed (${response.status}).`);
  return key ? data[key] : data;
}
export const fetchProperties = () => fetch('/api/properties', { headers: headers() }).then(handleApiResponse).then((r) => unwrap(r, 'items'));
export const createProperty = (payload) => fetch('/api/properties', { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(handleApiResponse).then((r) => unwrap(r, 'item'));
export const updateProperty = (id, payload) => fetch(`/api/properties/${id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }).then(handleApiResponse).then((r) => unwrap(r, 'item'));
export const deleteProperty = (id) => fetch(`/api/properties/${id}`, { method: 'DELETE', headers: headers() }).then(handleApiResponse).then((r) => unwrap(r));

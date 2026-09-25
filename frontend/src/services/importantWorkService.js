import { getAuthToken } from './authService';
import { handleApiResponse } from './api';

async function request(path = '', options = {}) {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required.');
  const response = await fetch(`/api/important-work${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  }).then(handleApiResponse);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to process important work reminder.');
  return data;
}

export const fetchImportantWork = () => request('/').then((data) => data.items || []);
export const createImportantWork = (item) => request('/', { method: 'POST', body: JSON.stringify(item) }).then((data) => data.item);
export const updateImportantWork = (id, item) => request(`/${id}`, { method: 'PUT', body: JSON.stringify(item) }).then((data) => data.item);
export const sendImportantWorkReminder = (id) => request(`/${id}/remind`, { method: 'POST' });

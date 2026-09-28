import { getAuthToken } from './authService';
import { handleApiResponse } from './api';
import { fetchWithRetry } from '../utils/fetchWithRetry';

export const ASSET_LIBRARIES = { KBZ_BANK: 'kbz_bank', KBZ_PAY: 'kbz_pay', KBZ_COMMS: 'kbz_comms' };
export const ASSET_LIBRARY_LABELS = { kbz_bank: 'KBZ Bank', kbz_pay: 'KBZPay', kbz_comms: 'KBZBank Comms' };

function authHeaders(json = false) {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required. Please sign in again.');
  return { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

async function readJson(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || fallback);
  return data;
}

export async function fetchAssets({ library } = {}) {
  const query = new URLSearchParams();
  if (library) query.set('library', library);
  const response = await fetchWithRetry(`/api/assets?${query}`, { headers: authHeaders() }).then(handleApiResponse);
  const data = await readJson(response, 'Unable to load brand assets.');
  return Array.isArray(data.assets) ? data.assets : [];
}

export async function uploadBrandAsset(metadata, file, onProgress = () => {}) {
  if (!file || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Only PNG and JPEG images are allowed.');
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error('Image must be between 1 byte and 10 MB.');

  onProgress(1);
  const initResponse = await fetch('/api/assets/uploads', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ ...metadata, originalName: file.name, mimeType: file.type, fileSize: file.size })
  }).then(handleApiResponse);
  const init = await readJson(initResponse, 'Unable to initialize upload.');

  try {
    onProgress(2);
    const storageResponse = await fetch(init.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type, 'x-amz-server-side-encryption': 'AES256' },
      body: file
    });
    if (!storageResponse.ok) {
      const body = await storageResponse.text().catch(() => '');
      const code = body.match(/<Code>([^<]+)<\/Code>/i)?.[1];
      throw new Error(`Secure image upload failed${code ? `: ${code}` : ''} (HTTP ${storageResponse.status}).`);
    }

    onProgress(3);
    const completeResponse = await fetch(`/api/assets/${init.assetId}/complete`, { method: 'POST', headers: authHeaders() }).then(handleApiResponse);
    const complete = await readJson(completeResponse, 'Image verification failed.');
    onProgress(4);
    return complete.asset;
  } catch (error) {
    await fetch(`/api/assets/${init.assetId}/upload`, { method: 'DELETE', headers: authHeaders() }).catch(() => {});
    throw error;
  }
}

export async function updateAsset(id, changes) {
  const response = await fetch(`/api/assets/${id}`, {
    method: 'PUT', headers: authHeaders(true), body: JSON.stringify(changes)
  }).then(handleApiResponse);
  return (await readJson(response, 'Unable to update asset.')).asset;
}

export async function deleteAsset(id) {
  const response = await fetch(`/api/assets/${id}`, { method: 'DELETE', headers: authHeaders() }).then(handleApiResponse);
  return readJson(response, 'Unable to remove asset.');
}

export async function fetchAssetDownloadUrl(id) {
  const response = await fetch(`/api/assets/${id}/download-url`, { headers: authHeaders() }).then(handleApiResponse);
  const data = await readJson(response, 'Unable to prepare download.');
  if (!data.url) throw new Error('Download link is unavailable.');
  return data.url;
}

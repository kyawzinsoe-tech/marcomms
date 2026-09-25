import { getAuthToken } from './authService';
import { handleApiResponse } from './api';
import { fetchWithRetry } from '../utils/fetchWithRetry';

export const ASSET_LIBRARIES = {
  KBZ_BANK: 'kbz_bank',
  KBZ_PAY: 'kbz_pay',
  KBZ_COMMS: 'kbz_comms'
};

export const ASSET_LIBRARY_LABELS = {
  kbz_bank: 'KBZ Bank',
  kbz_pay: 'KBZPay',
  kbz_comms: 'KBZBank Comms'
};

/**
 * Fetch assets from the backend API with optional filters
 * @param {Object} [params] - { library, category, search, archived }
 * @returns {Promise<Array>} Array of asset objects
 */
export async function fetchAssets(params = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to view asset libraries.');
  }

  const query = new URLSearchParams();
  if (params.library && params.library !== 'all') {
    query.set('library', params.library);
  }
  if (params.category && params.category !== 'All') {
    query.set('category', params.category);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.archived) {
    query.set('archived', 'true');
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithRetry(`/api/assets${queryString}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Unable to load assets from server (HTTP ${response.status}).`);
  }

  return Array.isArray(data.assets) ? data.assets : [];
}

/**
 * Fetch a single asset by ID
 * @param {string} id - Asset MongoDB ID
 * @returns {Promise<Object>} Asset object
 */
export async function fetchAssetById(id) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required.');
  }

  const response = await fetchWithRetry(`/api/assets/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Asset not found.');
  }

  return data.asset;
}

/**
 * Create a new brand asset
 * @param {Object} assetData - { title, library, category, fileUrl, thumbnailUrl, fileType, fileSize, version, tags, description }
 * @returns {Promise<Object>} Created asset
 */
export async function createAsset(assetData) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to upload assets.');
  }

  const response = await fetch('/api/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(assetData)
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Failed to create asset record (HTTP ${response.status}).`);
  }

  return data.asset;
}

export async function uploadBrandAsset(assetData, file, onProgress = () => {}) {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required.');
  if (!file || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Only PNG and JPEG images are allowed.');
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error('Image size must be between 1 byte and 10 MB.');

  onProgress(1);
  let assetId = '';
  const initResponse = await fetch('/api/assets/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...assetData, originalName: file.name, mimeType: file.type, fileSize: file.size })
  }).then(handleApiResponse);
  const initData = await initResponse.json().catch(() => ({}));
  if (!initResponse.ok) throw new Error(initData.error || 'Unable to initialize upload.');
  assetId = initData.assetId;

  try {
    onProgress(2);
    const uploadResponse = await fetch(initData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type, 'x-amz-server-side-encryption': 'AES256', 'x-amz-meta-upload': 'marcomms-brand-asset' },
      body: file
    });
    if (!uploadResponse.ok) {
      const requestId = uploadResponse.headers.get('x-amz-request-id');
      throw new Error(`Secure storage upload failed (HTTP ${uploadResponse.status}${requestId ? `, request ${requestId}` : ''}).`);
    }

    onProgress(3);
    const completeResponse = await fetch(`/api/assets/${assetId}/complete`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    }).then(handleApiResponse);
    const completeData = await completeResponse.json().catch(() => ({}));
    if (!completeResponse.ok) throw new Error(completeData.error || 'Image verification failed.');
    onProgress(4);
    return completeData.asset;
  } catch (error) {
    if (assetId) await fetch(`/api/assets/${assetId}/upload`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    throw error;
  }
}

/**
 * Update an existing asset
 * @param {string} id - Asset ID
 * @param {Object} assetData - Updated fields
 * @returns {Promise<Object>} Updated asset
 */
export async function updateAsset(id, assetData) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to modify assets.');
  }

  const response = await fetch(`/api/assets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(assetData)
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Failed to update asset (HTTP ${response.status}).`);
  }

  return data.asset;
}

/**
 * Permanently delete an asset
 * @param {string} id - Asset ID
 * @returns {Promise<{message: string, id: string}>}
 */
export async function deleteAsset(id) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required.');
  }

  const response = await fetch(`/api/assets/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Failed to delete asset (HTTP ${response.status}).`);
  }

  return data;
}

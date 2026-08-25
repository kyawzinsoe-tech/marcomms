import { getAuthToken } from './authService';

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
  const response = await fetch(`/api/assets${queryString}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

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

  const response = await fetch(`/api/assets/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

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
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Failed to create asset record (HTTP ${response.status}).`);
  }

  return data.asset;
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
  });

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
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Failed to delete asset (HTTP ${response.status}).`);
  }

  return data;
}

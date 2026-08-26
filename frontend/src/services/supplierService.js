import { getAuthToken } from './authService';
import { handleApiResponse } from './api';
import { fetchWithRetry } from '../utils/fetchWithRetry';

/**
 * Fetch procurement suppliers from the backend API
 * @param {Object} [params] - { category, status, search, archived }
 * @returns {Promise<Array>} Array of supplier objects
 */
export async function fetchSuppliers(params = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to view the supplier directory.');
  }

  const query = new URLSearchParams();
  if (params.category && params.category !== 'All') {
    query.set('category', params.category);
  }
  if (params.status && params.status !== 'All') {
    query.set('status', params.status);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.archived) {
    query.set('archived', 'true');
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const response = await fetchWithRetry(`/api/suppliers${queryString}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch suppliers from server.');
  }

  return Array.isArray(data.suppliers) ? data.suppliers : [];
}

/**
 * Fetch a single supplier by ID
 * @param {string} id - Supplier MongoDB ID
 * @returns {Promise<Object>} Supplier object
 */
export async function fetchSupplierById(id) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required.');
  }

  const response = await fetchWithRetry(`/api/suppliers/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Supplier not found.');
  }

  return data.supplier;
}

/**
 * Create a new procurement supplier
 * @param {Object} supplierData - { name, code, categories, contactPerson, phone, email, address, rating, status, notes }
 * @returns {Promise<Object>} Created supplier
 */
export async function createSupplier(supplierData) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to add suppliers.');
  }

  const response = await fetch('/api/suppliers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(supplierData)
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create supplier profile.');
  }

  return data.supplier;
}

/**
 * Update an existing supplier
 * @param {string} id - Supplier ID
 * @param {Object} supplierData - Updated fields
 * @returns {Promise<Object>} Updated supplier
 */
export async function updateSupplier(id, supplierData) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to update suppliers.');
  }

  const response = await fetch(`/api/suppliers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(supplierData)
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update supplier.');
  }

  return data.supplier;
}

/**
 * Permanently delete a supplier
 * @param {string} id - Supplier ID
 * @returns {Promise<{message: string, id: string}>}
 */
export async function deleteSupplier(id) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required.');
  }

  const response = await fetch(`/api/suppliers/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then(handleApiResponse);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete supplier.');
  }

  return data;
}

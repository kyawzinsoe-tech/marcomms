import { getAuthToken } from './authService';

export const PRODUCTION_STATUSES = [
  'Draft',
  'Submitted',
  'Sample Proofing',
  'In Production',
  'Delivered',
  'Cancelled'
];

/**
 * Fetch production orders from the backend API
 * @param {Object} [params] - { status, supplier, search, archived }
 * @returns {Promise<Array>} Array of production order objects
 */
export async function fetchProductionOrders(params = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to view production orders.');
  }

  const query = new URLSearchParams();
  if (params.status && params.status !== 'All') {
    query.set('status', params.status);
  }
  if (params.supplier && params.supplier !== 'All') {
    query.set('supplier', params.supplier);
  }
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params.archived) {
    query.set('archived', 'true');
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`/api/production-orders${queryString}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch production orders.');
  }

  return Array.isArray(data.productionOrders) ? data.productionOrders : [];
}

/**
 * Fetch a single production order by ID
 * @param {string} id - Production Order MongoDB ID
 * @returns {Promise<Object>} Production order object
 */
export async function fetchProductionOrderById(id) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required.');
  }

  const response = await fetch(`/api/production-orders/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Production order not found.');
  }

  return data.productionOrder;
}

/**
 * Create a new printing / production order
 * @param {Object} orderData - { orderNumber, campaignName, supplier, assetRef, itemDescription, specification, quantity, unitCost, totalCost, orderDate, deliveryDeadline, status, notes }
 * @returns {Promise<Object>} Created production order
 */
export async function createProductionOrder(orderData) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to place production orders.');
  }

  const response = await fetch('/api/production-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(orderData)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create production order.');
  }

  return data.productionOrder;
}

/**
 * Update an existing production order or record proof approval
 * @param {string} id - Production Order ID
 * @param {Object} orderData - Updated fields (can include { approveProof: true })
 * @returns {Promise<Object>} Updated production order
 */
export async function updateProductionOrder(id, orderData) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to update production orders.');
  }

  const response = await fetch(`/api/production-orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(orderData)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update production order.');
  }

  return data.productionOrder;
}

/**
 * Permanently delete a production order
 * @param {string} id - Production Order ID
 * @returns {Promise<{message: string, id: string}>}
 */
export async function deleteProductionOrder(id) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required.');
  }

  const response = await fetch(`/api/production-orders/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete production order.');
  }

  return data;
}

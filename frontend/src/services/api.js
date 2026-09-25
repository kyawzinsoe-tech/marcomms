import { getAuthToken } from './authService';
import { fetchWithRetry } from '../utils/fetchWithRetry';

const STORAGE_KEY = 'creativeHubDashboardV3';
const LEGACY_KEYS = ['creativeHubDashboardV2', 'creativeSubscriptionDashboardV1'];

export const DEMO_DATA = {
  reportMonth: '2026-08',
  subscriptions: [
    {
      id: 's1',
      product: 'Magnific',
      tool: 'AI + Photo Download',
      plan: 'Yearly',
      status: 'Inactive',
      start: '2026-08-19',
      expiry: '',
      cost: '',
      email: 'creative.team1010@gmail.com',
      reminderEmail: '',
      alertDays: 7,
      initialTokens: '',
      purchaseNote: '',
      archived: false
    },
    {
      id: 's2',
      product: 'Magnific',
      tool: 'AI + Photo Download',
      plan: 'Yearly',
      status: 'Inactive',
      start: '2026-08-19',
      expiry: '',
      cost: '',
      email: 'creative.team.kbz999@gmail.com',
      reminderEmail: '',
      alertDays: 7,
      initialTokens: '',
      purchaseNote: '',
      archived: false
    },
    {
      id: 's3',
      product: 'ChatGPT',
      tool: 'AI + Content Creation',
      plan: 'Monthly',
      status: 'Active',
      start: '2026-08-19',
      expiry: '2026-09-19',
      cost: '24',
      email: 'creative.team.kbz111@gmail.com',
      reminderEmail: '',
      alertDays: 7,
      initialTokens: '',
      purchaseNote: '',
      archived: false
    }
  ],
  tokenEntries: []
};

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeData(data) {
  const d = data || JSON.parse(JSON.stringify(DEMO_DATA));
  const reportMonth = d.reportMonth || new Date().toISOString().slice(0, 7);
  
  const subscriptions = (d.subscriptions || []).map((x) => ({
    id: x.id || x._id || generateId('sub'),
    product: x.product || '',
    tool: x.tool || '',
    plan: x.plan || 'Monthly',
    status: x.status || 'Active',
    start: x.start || x.startDate || '',
    expiry: x.expiry || x.expireDate || '',
    cost: x.cost !== undefined && x.cost !== null ? String(x.cost) : '',
    email: x.email || '',
    reminderEmail: x.reminderEmail || '',
    alertDays: Number(x.alertDays ?? 7),
    initialTokens: x.initialTokens !== undefined && x.initialTokens !== null ? String(x.initialTokens) : '',
    purchaseNote: x.purchaseNote || '',
    hasPassword: !!x.hasPassword,
    invoice: x.invoice || null,
    archived: !!x.archived
  }));

  const tokenEntries = (d.tokenEntries || []).map((x) => ({
    id: x.id || x._id || generateId('tok'),
    date: x.date || '',
    account: x.account || '',
    project: x.project || '',
    tokens: Number(x.tokens || 0),
    cost: x.cost !== undefined && x.cost !== null ? String(x.cost) : '',
    notes: x.notes || '',
    archived: !!x.archived
  }));

  return { reportMonth, subscriptions, tokenEntries };
}

export function handleApiResponse(response) {
  if (response && response.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('marcomms:session-expired', {
        detail: { message: 'Your session has expired. Please sign in again.' }
      }));
    }
  }
  return response;
}

export async function fetchDashboardData() {
  const token = getAuthToken();

  // 1. Try Backend API
  if (token) {
    try {
      const [subRes, tokRes] = await Promise.all([
        fetchWithRetry('/api/subscriptions', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(handleApiResponse),
        fetchWithRetry('/api/tokens', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(handleApiResponse)
      ]);

      if (subRes.ok && tokRes.ok) {
        const subData = await subRes.json();
        const tokData = await tokRes.json();

        const loaded = normalizeData({
          reportMonth: '2026-08',
          subscriptions: subData.subscriptions,
          tokenEntries: tokData.tokenEntries
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
        return loaded;
      }
    } catch {
      console.log('[API Service] Backend API error, using local storage cache');
    }
  }

  // 2. Local Storage Cache / Migration
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeData(JSON.parse(raw));
    }

    for (const key of LEGACY_KEYS) {
      const old = localStorage.getItem(key);
      if (old) {
        const migrated = normalizeData(JSON.parse(old));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch (error) {
    console.error('Error reading localStorage:', error);
  }

  return normalizeData(DEMO_DATA);
}

export async function fetchExecutiveSummary() {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required.');
  const response = await fetchWithRetry('/api/dashboard/summary', { headers: { Authorization: `Bearer ${token}` } }).then(handleApiResponse);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to load live executive metrics.');
  return data;
}

export async function saveDashboardData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Also sync to Backend API if user is authenticated
    const token = getAuthToken();
    if (token) {
      fetch('/api/backup/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        // Subscription records use dedicated endpoints so encrypted credentials and
        // private invoice metadata can never be overwritten by a dashboard snapshot.
        body: JSON.stringify({ ...data, subscriptions: undefined })
      }).catch((e) => console.log('[API Sync] Background sync to MongoDB:', e.message));
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving dashboard state:', error);
    return { success: false, error };
  }
}

async function authenticatedJson(url, options = {}) {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication required.');
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  }).then(handleApiResponse);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

export async function saveSubscriptionRecord(formData, id) {
  const data = await authenticatedJson(id ? `/api/subscriptions/${id}` : '/api/subscriptions', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(formData)
  });
  return data.subscription;
}

export async function uploadSubscriptionInvoice(subscriptionId, file, onProgress = () => {}) {
  onProgress('authorizing');
  const setup = await authenticatedJson(`/api/subscriptions/${subscriptionId}/invoice/upload`, {
    method: 'POST',
    body: JSON.stringify({ originalName: file.name, mimeType: file.type, fileSize: file.size })
  });
  onProgress('uploading');
  const upload = await fetch(setup.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, 'x-amz-server-side-encryption': 'AES256', 'x-amz-meta-purpose': 'subscription-invoice' },
    body: file
  });
  if (!upload.ok) throw new Error('Invoice upload failed.');
  onProgress('verifying');
  const completed = await authenticatedJson(`/api/subscriptions/${subscriptionId}/invoice/complete`, { method: 'POST', body: '{}' });
  onProgress('complete');
  return completed.subscription;
}

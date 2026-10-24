const DEFAULT_BUCKET = 'marcomms-assets';

function getConfig() {
  const baseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  const bucket = String(process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET);
  if (!baseUrl || !serviceKey) {
    const error = new Error('Secure file storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    error.statusCode = 503;
    throw error;
  }
  return { baseUrl, serviceKey, bucket };
}

function encodedPath(value) {
  return String(value || '').split('/').map(encodeURIComponent).join('/');
}

async function storageRequest(path, options = {}) {
  const { baseUrl, serviceKey } = getConfig();
  const response = await fetch(`${baseUrl}/storage/v1${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.message || payload.error || `Secure storage request failed (HTTP ${response.status}).`);
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }
  return response;
}

async function uploadAssetObject(key, bytes, mimeType) {
  const { bucket } = getConfig();
  await storageRequest(`/object/${encodeURIComponent(bucket)}/${encodedPath(key)}`, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'private, max-age=3600',
      'x-upsert': 'false'
    },
    body: bytes
  });
}

async function deleteAssetObject(key) {
  const { bucket } = getConfig();
  await storageRequest(`/object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [key] })
  });
}

async function createAssetDownloadUrl(key, expiresIn = 300) {
  const { baseUrl, bucket } = getConfig();
  const response = await storageRequest(`/object/sign/${encodeURIComponent(bucket)}/${encodedPath(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn })
  });
  const payload = await response.json();
  const signedPath = payload.signedURL || payload.signedUrl;
  if (!signedPath) throw new Error('Secure storage did not return a download URL.');
  return signedPath.startsWith('http') ? signedPath : `${baseUrl}/storage/v1${signedPath}`;
}

module.exports = { uploadAssetObject, deleteAssetObject, createAssetDownloadUrl };

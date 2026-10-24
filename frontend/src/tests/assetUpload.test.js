import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/authService', () => ({ getAuthToken: () => 'test-token' }));

import { uploadBrandAsset } from '../services/assetService';
import { formatErrorMessage } from '../components/common/formatErrorMessage';

describe('secure brand asset upload', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uploads image bytes through the authenticated backend storage endpoint', async () => {
    const requests = [];
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      requests.push({ url, options });
      if (url === '/api/assets/uploads') {
        return new Response(JSON.stringify({ assetId: 'asset-1', uploadUrl: '/api/assets/asset-1/content' }), { status: 201 });
      }
      return new Response(JSON.stringify({ asset: { id: 'asset-1', uploadStatus: 'ready' } }), { status: 200 });
    }));

    const file = new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' });
    await uploadBrandAsset({ title: 'Logo', library: 'kbz_bank' }, file);

    expect(requests).toHaveLength(2);
    expect(requests[1].url).toBe('/api/assets/asset-1/content');
    expect(requests[1].options.headers.Authorization).toBe('Bearer test-token');
    expect(requests[1].options.body).toBe(file);
  });

  it('keeps a storage diagnostic instead of mislabeling it as RBAC', () => {
    const message = 'Secure storage upload failed (HTTP 503).';
    expect(formatErrorMessage(message)).toBe(message);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/authService', () => ({ getAuthToken: () => 'test-token' }));

import { uploadBrandAsset } from '../services/assetService';
import { formatErrorMessage } from '../components/common/formatErrorMessage';

describe('secure brand asset upload', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('does not duplicate presigned metadata as an unsigned S3 header', async () => {
    const requests = [];
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      requests.push({ url, options });
      if (url === '/api/assets/uploads') {
        return new Response(JSON.stringify({ assetId: 'asset-1', uploadUrl: 'https://assets.example/upload?x-amz-meta-upload=marcomms-brand-asset' }), { status: 201 });
      }
      if (String(url).startsWith('https://assets.example/')) return new Response('', { status: 200 });
      return new Response(JSON.stringify({ asset: { id: 'asset-1', uploadStatus: 'ready' } }), { status: 200 });
    }));

    const file = new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' });
    await uploadBrandAsset({ title: 'Logo', library: 'kbz_bank' }, file);

    expect(requests[1].options.headers['x-amz-meta-upload']).toBeUndefined();
    expect(requests[1].options.headers['x-amz-server-side-encryption']).toBe('AES256');
  });

  it('keeps an S3 HTTP 403 diagnostic instead of mislabeling it as RBAC', () => {
    const message = 'Secure storage upload failed: SignatureDoesNotMatch (HTTP 403).';
    expect(formatErrorMessage(message)).toBe(message);
  });
});

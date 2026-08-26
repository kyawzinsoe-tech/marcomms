import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from './fetchWithRetry';

describe('fetchWithRetry Utility Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns response immediately on successful 200 OK without retrying', async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    globalThis.fetch = fetchSpy;

    const response = await fetchWithRetry('/api/test', {}, 2, 10);

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns client-side 4xx errors (400, 401, 403, 404) immediately without retrying', async () => {
    const clientStatuses = [400, 401, 403, 404, 422];

    for (const status of clientStatuses) {
      const mockResponse = new Response(JSON.stringify({ error: 'Client Error' }), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });

      const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
      globalThis.fetch = fetchSpy;

      const response = await fetchWithRetry('/api/test', {}, 2, 10);

      expect(response.status).toBe(status);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    }
  });

  it('retries transient 502/503/504 errors and succeeds on subsequent attempt', async () => {
    const error503 = new Response('Service Unavailable', { status: 503 });
    const success200 = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(error503)
      .mockResolvedValueOnce(success200);
    globalThis.fetch = fetchSpy;

    const response = await fetchWithRetry('/api/test', {}, 2, 10);

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('exhausts retry attempts on persistent 500 error and returns final response', async () => {
    const error500 = new Response('Server Error', { status: 500 });

    const fetchSpy = vi.fn().mockResolvedValue(error500);
    globalThis.fetch = fetchSpy;

    const response = await fetchWithRetry('/api/test', {}, 2, 10);

    expect(response.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('retries on network TypeError and succeeds on subsequent attempt', async () => {
    const success200 = new Response(JSON.stringify({ recovered: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(success200);
    globalThis.fetch = fetchSpy;

    const response = await fetchWithRetry('/api/test', {}, 2, 10);

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('throws error when network failure persists past maxRetries', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new TypeError('Connection refused'));
    globalThis.fetch = fetchSpy;

    await expect(fetchWithRetry('/api/test', {}, 2, 10)).rejects.toThrow('Connection refused');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCurrentUser,
  getAuthToken,
  logoutUser,
  loginUser
} from './authService';

const AUTH_STORAGE_KEY = 'creativeHubAuthUser';

describe('Authentication & Session Service Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns null when no session is stored in localStorage', () => {
    expect(getCurrentUser()).toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  it('retrieves and normalizes user role from valid stored session', () => {
    const session = {
      id: 'usr_1',
      name: 'Jane Doe',
      email: 'jane@kbzbank.com',
      role: 'HEAD_BRAND',
      token: 'jwt-header.payload.signature'
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

    const user = getCurrentUser();
    expect(user).not.toBeNull();
    expect(user.role).toBe('head_brand');
    expect(getAuthToken()).toBe('jwt-header.payload.signature');
  });

  it('handles corrupted JSON in localStorage gracefully without throwing', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{invalid-json');

    expect(getCurrentUser()).toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  it('clears stored session from localStorage upon logout', async () => {
    const session = {
      id: 'usr_2',
      name: 'John Smith',
      email: 'john@kbzbank.com',
      role: 'super_admin',
      token: 'test-token-123'
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));

    await logoutUser();

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(getCurrentUser()).toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  it('validates required credentials before attempting login fetch', async () => {
    await expect(loginUser('', '')).rejects.toThrow('Please enter both your work email and password.');
    await expect(loginUser('test@kbzbank.com', '')).rejects.toThrow('Please enter both your work email and password.');
  });
});

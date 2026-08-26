import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendEmailReminder } from './emailService';

const AUTH_STORAGE_KEY = 'creativeHubAuthUser';

describe('Email Reminder Service Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('throws error when subscription has no configured email address', async () => {
    const subWithoutEmail = {
      product: 'Adobe Creative Cloud',
      email: '',
      reminderEmail: ''
    };

    await expect(sendEmailReminder(subWithoutEmail, 5)).rejects.toThrow(
      'Please configure an account or reminder email for this subscription first.'
    );
  });

  it('throws error when user is unauthenticated', async () => {
    const validSub = {
      product: 'Magnific AI Pro',
      email: 'team@kbzbank.com'
    };

    await expect(sendEmailReminder(validSub, 3)).rejects.toThrow(
      'Authentication required. Please sign in to dispatch reminder emails.'
    );
  });

  it('dispatches reminder and returns success object on 200 response', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      id: 'usr_1',
      role: 'admin',
      token: 'valid-jwt-token'
    }));

    const mockResponse = new Response(JSON.stringify({
      success: true,
      message: 'Reminder sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    globalThis.fetch = fetchSpy;

    const sub = {
      id: 'sub_123',
      product: 'Midjourney Pro',
      email: 'creative@kbzbank.com',
      expiry: '2026-08-30'
    };

    const result = await sendEmailReminder(sub, 4);

    expect(result.success).toBe(true);
    expect(result.recipient).toBe('creative@kbzbank.com');
    expect(result.message).toBe('Reminder sent successfully');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const calledBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(calledBody.to).toBe('creative@kbzbank.com');
    expect(calledBody.status).toBe('Due Soon');
    expect(calledBody.days).toBe(4);
  });

  it('formats status as Overdue when daysDiff is negative', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      id: 'usr_1',
      role: 'admin',
      token: 'valid-jwt-token'
    }));

    const mockResponse = new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
    globalThis.fetch = fetchSpy;

    const sub = {
      product: 'Figma Enterprise',
      email: 'design@kbzbank.com',
      expiry: '2026-08-20'
    };

    await sendEmailReminder(sub, -6);

    const calledBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(calledBody.status).toBe('Overdue');
    expect(calledBody.days).toBe(-6);
  });

  it('throws server error message when backend returns non-ok response', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      id: 'usr_1',
      role: 'admin',
      token: 'valid-jwt-token'
    }));

    const errorResponse = new Response(JSON.stringify({
      error: 'SES Daily Quota Exceeded'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });

    globalThis.fetch = vi.fn().mockResolvedValue(errorResponse);

    const sub = {
      product: 'OpenAI Team',
      email: 'ai@kbzbank.com'
    };

    await expect(sendEmailReminder(sub, 2)).rejects.toThrow('SES Daily Quota Exceeded');
  });
});

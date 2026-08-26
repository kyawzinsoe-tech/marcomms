import { describe, it, expect } from 'vitest';
import {
  getTodayISO,
  calculateDayDiff,
  formatDate,
  formatDateTime,
  formatMonthName,
  formatMoney,
  formatNumber
} from './formatters';

describe('formatters utility functions', () => {
  it('returns valid ISO date string for getTodayISO', () => {
    const today = getTodayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('calculates day difference between two ISO dates correctly', () => {
    expect(calculateDayDiff('2026-08-01', '2026-08-10')).toBe(9);
    expect(calculateDayDiff('2026-08-10', '2026-08-01')).toBe(-9);
    expect(calculateDayDiff(null, '2026-08-10')).toBe(0);
  });

  it('formats dates safely without throwing on invalid input', () => {
    expect(formatDate('2026-08-26')).toContain('2026');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('invalid-date')).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('formats date and time safely', () => {
    expect(formatDateTime('2026-08-26T10:30:00Z')).toContain('2026');
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('invalid')).toBe('—');
  });

  it('formats month strings to human-readable month and year', () => {
    expect(formatMonthName('2026-08')).toBe('August 2026');
    expect(formatMonthName('2026-01')).toBe('January 2026');
    expect(formatMonthName(null)).toBe('');
  });

  it('formats money amounts with USD symbol and commas', () => {
    expect(formatMoney(1500)).toBe('$1,500');
    expect(formatMoney(1500.5)).toBe('$1,500.50');
    expect(formatMoney(0)).toBe('$0');
    expect(formatMoney(null)).toBe('$0');
  });

  it('formats raw numbers with commas', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(0)).toBe('0');
  });
});

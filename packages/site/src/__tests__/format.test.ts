import { describe, expect, it } from 'vitest';
import { formatNumber, formatRate } from '../format.js';

describe('formatNumber', () => {
  it('shows at most 1 decimal and no floating-point error', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(12.34)).toBe('12.3');
    expect(formatNumber(12)).toBe('12');
  });

  it('separates each 3 digits with a comma', () => {
    expect(formatNumber(12000)).toBe('12,000');
  });

  it('never shows a negative zero', () => {
    expect(formatNumber(-0.04)).toBe('0');
  });
});

describe('formatRate', () => {
  it('adds the percent sign', () => {
    expect(formatRate(12.5)).toBe('12.5%');
  });

  it('returns null for a certain rate', () => {
    expect(formatRate(100)).toBeNull();
    expect(formatRate(99.96)).toBeNull();
    expect(formatRate(99.9)).toBe('99.9%');
  });
});

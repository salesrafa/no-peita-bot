import { describe, it, expect } from 'vitest';
import { generateFullMoonDates } from '../../src/core/fullMoon';

describe('generateFullMoonDates', () => {
  it('returns DD/MM/YYYY dates within the requested month/year', () => {
    const month = 6; // June
    const year = 2025;
    const dates = generateFullMoonDates(year, month);

    expect(Array.isArray(dates)).toBe(true);
    // The lib labels several consecutive days as 'Full', so one full moon can
    // yield 2-3 dates; we just bound it loosely to catch runaway output.
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.length).toBeLessThanOrEqual(5);

    for (const ds of dates) {
      expect(ds).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      const [, mm, yyyy] = ds.split('/');
      expect(Number(mm)).toBe(month);
      expect(Number(yyyy)).toBe(year);
    }
  });

  it('finds a full moon in a month that has one', () => {
    // Sweep a few months; at least one should report a full moon.
    const counts = [1, 2, 3, 4].map((m) => generateFullMoonDates(2025, m).length);
    expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { core } from '../helpers/gasCore';

const {
  formatDate, parseBrDate, daysBetween, getMonthNamePtBr,
  getPeriodFromMessage, getPeriodByYear,
} = core;

describe('formatDate', () => {
  it('formats as DD/MM/YYYY', () => {
    expect(formatDate(new Date(2026, 5, 9))).toBe('09/06/2026'); // month 5 = June
    expect(formatDate(new Date(2025, 11, 31))).toBe('31/12/2025');
  });
});

describe('parseBrDate', () => {
  it('parses start of day', () => {
    const d = parseBrDate('09/06/2026', true);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(0);
  });
  it('parses end of day', () => {
    const d = parseBrDate('09/06/2026', false);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween(new Date(2026, 5, 1), new Date(2026, 5, 5))).toBe(4);
    expect(daysBetween(new Date(2026, 5, 5), new Date(2026, 5, 5))).toBe(0);
  });
});

describe('getMonthNamePtBr', () => {
  it('returns pt-BR month names', () => {
    expect(getMonthNamePtBr(0)).toBe('Janeiro');
    expect(getMonthNamePtBr(5)).toBe('Junho');
    expect(getMonthNamePtBr(11)).toBe('Dezembro');
  });
});

describe('getPeriodFromMessage (with injected now)', () => {
  const now = new Date(2026, 5, 15); // 15 Jun 2026

  it('default → current month', () => {
    const p = getPeriodFromMessage('/ranking', now);
    expect(p.type).toBe('mes');
    expect(p.label).toBe('Junho/2026');
    expect(p.start.getMonth()).toBe(5);
    expect(p.start.getDate()).toBe(1);
    expect(p.end.getMonth()).toBe(5);
    expect(p.end.getDate()).toBe(30);
  });

  it('MM/AAAA → that month', () => {
    const p = getPeriodFromMessage('/ranking 03/2025', now);
    expect(p.type).toBe('mes');
    expect(p.label).toBe('Março/2025');
    expect(p.start.getFullYear()).toBe(2025);
    expect(p.start.getMonth()).toBe(2);
  });

  it('DD/MM/AAAA DD/MM/AAAA → interval', () => {
    const p = getPeriodFromMessage('/ranking 01/01/2025 31/01/2025', now);
    expect(p.type).toBe('intervalo');
    expect(p.label).toBe('01/01/2025 → 31/01/2025');
    expect(p.start.getDate()).toBe(1);
    expect(p.end.getDate()).toBe(31);
  });

  it('does not mutate the injected now', () => {
    const snapshot = now.getTime();
    getPeriodFromMessage('/ranking', now);
    expect(now.getTime()).toBe(snapshot);
  });
});

describe('getPeriodByYear (with injected now)', () => {
  it('default → current year', () => {
    const p = getPeriodByYear('/rankingano', new Date(2026, 0, 1));
    expect(p.label).toBe('Ranking 2026');
    expect(p.start.getFullYear()).toBe(2026);
    expect(p.end.getFullYear()).toBe(2026);
  });
  it('explicit year', () => {
    const p = getPeriodByYear('/rankingano 2024', new Date(2026, 0, 1));
    expect(p.label).toBe('Ranking 2024');
    expect(p.start.getFullYear()).toBe(2024);
  });
});

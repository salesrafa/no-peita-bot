import { describe, it, expect } from 'vitest';
import { core } from '../helpers/gasCore';

const { parsePrediction, predictionsOpen, formatMatchList, formatKickoffTime } = core;

// Helper: a match kicking off at a given local date/time.
function match(home: string, away: string, y: number, mo: number, d: number, h: number, min = 0) {
  return { home, away, kickoff: new Date(y, mo, d, h, min, 0, 0) };
}

describe('parsePrediction', () => {
  it('parses the canonical "/palpite BRAxSUI 2x1" form', () => {
    expect(parsePrediction('/palpite BRAxSUI 2x1')).toEqual({
      home: 'BRA', away: 'SUI', homeGoals: 2, awayGoals: 1,
    });
  });

  it('upper-cases teams and tolerates spaces and X/:/- separators', () => {
    expect(parsePrediction('/palpite arg X mex 0:0')).toEqual({
      home: 'ARG', away: 'MEX', homeGoals: 0, awayGoals: 0,
    });
    expect(parsePrediction('/palpite Por x Gha 3-1')).toEqual({
      home: 'POR', away: 'GHA', homeGoals: 3, awayGoals: 1,
    });
  });

  it('returns null for malformed input', () => {
    expect(parsePrediction('/palpite')).toBeNull();
    expect(parsePrediction('/palpite BRA 2x1')).toBeNull();
    expect(parsePrediction('/palpite BRAxSUI dois a um')).toBeNull();
    expect(parsePrediction('')).toBeNull();
  });
});

describe('predictionsOpen', () => {
  const now = new Date(2026, 5, 17, 12, 0, 0);
  it('is open before kickoff and closed at/after it', () => {
    expect(predictionsOpen(match('BRA', 'SUI', 2026, 5, 17, 13), now)).toBe(true);
    expect(predictionsOpen(match('BRA', 'SUI', 2026, 5, 17, 11), now)).toBe(false);
  });
});

describe('formatKickoffTime', () => {
  it('zero-pads hours and minutes', () => {
    expect(formatKickoffTime(new Date(2026, 5, 17, 9, 5))).toBe('09:05');
    expect(formatKickoffTime(new Date(2026, 5, 17, 13, 0))).toBe('13:00');
  });
});

describe('formatMatchList', () => {
  const now = new Date(2026, 5, 17, 12, 0, 0); // 17/06/2026 12:00

  it('groups by Hoje/Amanhã, shows the pair and a copyable example', () => {
    const matches = [
      match('BRA', 'SUI', 2026, 5, 17, 13),
      match('ARG', 'MEX', 2026, 5, 17, 16),
      match('POR', 'GHA', 2026, 5, 18, 13),
    ];
    const text = formatMatchList(matches, now);

    expect(text).toContain('Hoje (17/06)');
    expect(text).toContain('Amanhã (18/06)');
    expect(text).toContain('BRA x SUI — 13:00');
    expect(text).toContain('POR x GHA — 13:00');
    expect(text).toContain('/palpite BRAxSUI 2x1'); // first match drives the example
  });

  it('marks a match whose kickoff already passed as closed', () => {
    const text = formatMatchList([match('BRA', 'SUI', 2026, 5, 17, 9)], now);
    expect(text).toContain('⛔ fechado');
  });
});

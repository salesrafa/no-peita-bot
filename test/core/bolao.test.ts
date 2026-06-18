import { describe, it, expect } from 'vitest';
import { core } from '../helpers/gasCore';

const {
  parsePrediction, predictionsOpen, formatMatchList, formatKickoffTime,
  parseResult, matchOutcome, scoreBasePoints, applyTrainingMultiplier,
  sortBolaoRanking, formatBolaoRanking, planResultUpdates,
} = core;

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

describe('parseResult', () => {
  it('parses "/resultado BRAxSUI 2x1" but not a /palpite', () => {
    expect(parseResult('/resultado BRAxSUI 2x1')).toEqual({
      home: 'BRA', away: 'SUI', homeGoals: 2, awayGoals: 1,
    });
    expect(parseResult('/palpite BRAxSUI 2x1')).toBeNull();
  });
});

describe('matchOutcome', () => {
  it('classifies home win, away win and draw', () => {
    expect(matchOutcome(2, 1)).toBe('home');
    expect(matchOutcome(0, 3)).toBe('away');
    expect(matchOutcome(1, 1)).toBe('draw');
  });
});

describe('scoreBasePoints', () => {
  const result = { homeGoals: 2, awayGoals: 1 };

  it('gives 4 for the exact score', () => {
    expect(scoreBasePoints({ homeGoals: 2, awayGoals: 1 }, result)).toBe(4);
  });

  it('gives 2 for the right winner but wrong score', () => {
    expect(scoreBasePoints({ homeGoals: 3, awayGoals: 0 }, result)).toBe(2);
  });

  it('gives 2 for the right draw but wrong score', () => {
    expect(scoreBasePoints({ homeGoals: 0, awayGoals: 0 }, { homeGoals: 1, awayGoals: 1 })).toBe(2);
  });

  it('gives 0 when the predicted winner is wrong', () => {
    expect(scoreBasePoints({ homeGoals: 0, awayGoals: 2 }, result)).toBe(0);
    expect(scoreBasePoints({ homeGoals: 1, awayGoals: 1 }, result)).toBe(0);
  });
});

describe('applyTrainingMultiplier', () => {
  it('doubles the base when trained, keeps it otherwise, and 0 stays 0', () => {
    expect(applyTrainingMultiplier(4, true)).toBe(8);
    expect(applyTrainingMultiplier(2, true)).toBe(4);
    expect(applyTrainingMultiplier(4, false)).toBe(4);
    expect(applyTrainingMultiplier(0, true)).toBe(0);
  });
});

describe('sortBolaoRanking', () => {
  it('orders by points, then exact hits, then name', () => {
    const ranked = sortBolaoRanking([
      { name: 'Bia', points: 8, exacts: 1 },
      { name: 'Ana', points: 10, exacts: 0 },
      { name: 'Dan', points: 8, exacts: 2 },
    ]);
    expect(ranked.map((r: any) => r.name)).toEqual(['Ana', 'Dan', 'Bia']);
  });
});

describe('formatBolaoRanking', () => {
  it('shows an empty-state when nobody scored', () => {
    expect(formatBolaoRanking([])).toContain('Nenhum palpite pontuado ainda');
  });

  it('renders medals and the points', () => {
    const text = formatBolaoRanking([
      { name: 'Ana', points: 10, exacts: 0 },
      { name: 'Dan', points: 8, exacts: 2 },
    ]);
    expect(text).toContain('🥇 *Ana* — 10 pts');
    expect(text).toContain('🥈 *Dan* — 8 pts');
    expect(text).toContain('2 placares exatos 🎯');
  });
});

describe('planResultUpdates', () => {
  const ours = [
    { id: 1, home: 'BRA', away: 'HAI', status: 'agendado' },
    { id: 2, home: 'SUI', away: 'CAN', status: 'agendado' },
    { id: 3, home: 'ARG', away: 'AUT', status: 'encerrado' }, // already graded
  ];

  const apiMatch = (homeTla: string, awayTla: string, h: number, a: number) => ({
    homeTeam: { tla: homeTla },
    awayTeam: { tla: awayTla },
    score: { fullTime: { home: h, away: a } },
  });

  it('maps a finished match to our row with the score', () => {
    const { updates, unmatched } = planResultUpdates([apiMatch('BRA', 'HAI', 2, 1)], ours);
    expect(unmatched).toEqual([]);
    expect(updates).toHaveLength(1);
    expect(updates[0].match.id).toBe(1);
    expect(updates[0].homeGoals).toBe(2);
    expect(updates[0].awayGoals).toBe(1);
  });

  it('reorients the score when the API has home/away swapped', () => {
    // API lists HAI as home; our row has BRA as mandante → goals must flip
    const { updates } = planResultUpdates([apiMatch('HAI', 'BRA', 1, 2)], ours);
    expect(updates[0].match.id).toBe(1);
    expect(updates[0].homeGoals).toBe(2); // BRA (our mandante)
    expect(updates[0].awayGoals).toBe(1); // HAI
  });

  it('skips matches already marked encerrado', () => {
    const { updates, unmatched } = planResultUpdates([apiMatch('ARG', 'AUT', 3, 0)], ours);
    expect(updates).toEqual([]);
    expect(unmatched).toHaveLength(1); // no open row to match
  });

  it('reports unknown pairs as unmatched', () => {
    const { updates, unmatched } = planResultUpdates([apiMatch('XYZ', 'ABC', 0, 0)], ours);
    expect(updates).toEqual([]);
    expect(unmatched).toEqual(['XYZ x ABC (0x0)']);
  });

  it('ignores API matches without a full-time score', () => {
    const noScore = { homeTeam: { tla: 'BRA' }, awayTeam: { tla: 'HAI' }, score: { fullTime: { home: null, away: null } } };
    const { updates } = planResultUpdates([noScore], ours);
    expect(updates).toEqual([]);
  });
});

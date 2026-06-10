import { describe, it, expect } from 'vitest';
import { core } from '../helpers/gasCore';

const {
  computeTotalAndStreak, applyRankWithTies, computeRankingMetricsWithAB,
  sortOlympicRanking, initAthlete,
} = core;

const d = (day: number) => new Date(2026, 5, day); // June 2026

describe('computeTotalAndStreak', () => {
  it('counts unique days and the longest consecutive streak', () => {
    expect(computeTotalAndStreak([d(1), d(2), d(3)])).toEqual({ total: 3, streak: 3 });
    expect(computeTotalAndStreak([d(1), d(3)])).toEqual({ total: 2, streak: 1 });
    expect(computeTotalAndStreak([d(1), d(2), d(5), d(6), d(7)])).toEqual({ total: 5, streak: 3 });
  });
  it('dedups same-day entries', () => {
    expect(computeTotalAndStreak([d(1), d(1)])).toEqual({ total: 1, streak: 1 });
  });
  it('handles empty', () => {
    expect(computeTotalAndStreak([])).toEqual({ total: 0, streak: 0 });
  });
});

describe('applyRankWithTies', () => {
  it('gives equal totals+streaks the same rank', () => {
    const rows = [
      { name: 'A', total: 5, streak: 2 },
      { name: 'B', total: 5, streak: 2 },
      { name: 'C', total: 3, streak: 1 },
    ];
    expect(applyRankWithTies(rows).map((r: any) => r.rank)).toEqual([1, 1, 3]);
  });
});

describe('computeRankingMetricsWithAB', () => {
  it('aggregates daily + pre-bot (AB) totals and ranks', () => {
    const byPerson = {
      u1: { name: 'A', dates: [d(1), d(2)], totalAB: 0 },
      u2: { name: 'B', dates: [d(1)], totalAB: 3 },
    };
    const ranking = computeRankingMetricsWithAB(byPerson);
    expect(ranking).toHaveLength(2);
    expect(ranking[0]).toMatchObject({ name: 'B', total: 4, rank: 1 }); // 1 daily + 3 AB
    expect(ranking[1]).toMatchObject({ name: 'A', total: 2, rank: 2 });
  });
});

describe('sortOlympicRanking', () => {
  it('sorts by gold, then silver, then bronze, then name', () => {
    const medals = {
      A: { name: 'A', gold: 1, silver: 0, bronze: 0 },
      B: { name: 'B', gold: 1, silver: 2, bronze: 0 },
      C: { name: 'C', gold: 0, silver: 9, bronze: 9 },
    };
    expect(sortOlympicRanking(medals).map((m: any) => m.name)).toEqual(['B', 'A', 'C']);
  });
});

describe('initAthlete', () => {
  it('creates a zeroed entry once, without resetting', () => {
    const medals: any = {};
    initAthlete('X', medals);
    expect(medals.X).toEqual({ name: 'X', gold: 0, silver: 0, bronze: 0 });
    medals.X.gold = 5;
    initAthlete('X', medals);
    expect(medals.X.gold).toBe(5);
  });
});

import { describe, it, expect } from 'vitest';
import { core } from '../helpers/gasCore';

const { formatRanking, progressBar, ticketStatusEmoji } = core;

describe('ticketStatusEmoji', () => {
  it('maps the 3 statuses (case-insensitive), defaults to pendente', () => {
    expect(ticketStatusEmoji('finalizado')).toBe('✅');
    expect(ticketStatusEmoji('FINALIZADO')).toBe('✅');
    expect(ticketStatusEmoji('ignorado')).toBe('🚫');
    expect(ticketStatusEmoji('pendente')).toBe('⏳');
    expect(ticketStatusEmoji('')).toBe('⏳');
    expect(ticketStatusEmoji(undefined)).toBe('⏳');
  });
});

describe('progressBar', () => {
  it('renders 10 blocks proportionally, clamped', () => {
    expect(progressBar(0, 150)).toBe('⬜'.repeat(10));
    expect(progressBar(75, 150)).toBe('🟩'.repeat(5) + '⬜'.repeat(5));
    expect(progressBar(150, 150)).toBe('🟩'.repeat(10));
    expect(progressBar(200, 150)).toBe('🟩'.repeat(10)); // capped
  });
});

describe('formatRanking', () => {
  const ranking = [{ rank: 1, name: 'João', total: 15, streak: 4 }];

  it('handles empty ranking', () => {
    expect(formatRanking([], 'Junho/2026', false)).toBe('📊 Nenhum treino encontrado no período.');
  });

  it('without animal badge: no 🐾 hint, no animal emoji', () => {
    const out = formatRanking(ranking, 'Junho/2026', false);
    expect(out).toContain('1 - 🥇 *João* - 15 treino(s) - 🔥 4');
    expect(out).not.toContain('🐾');
    expect(out).not.toContain('🐆');
  });

  it('with animal badge: shows the animal emoji and the /eu hint', () => {
    const out = formatRanking(ranking, 'Junho/2026', true);
    expect(out).toContain('🔥 4 🐆'); // 15 workouts → Onça 🐆
    expect(out).toContain('🐾 Use /eu para entender seu bicho do mês.');
  });
});

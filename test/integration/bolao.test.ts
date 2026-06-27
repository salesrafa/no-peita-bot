import { describe, it, expect, beforeEach } from 'vitest';
import { loadShell } from '../helpers/gasShell';

// Match dates are relative to "now" so /jogos and the kickoff lock behave
// deterministically. We seed a match TOMORROW at noon (always open) plus a
// registered user.
function setup() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomorrowStr = `${dd}/${mm}/${tomorrow.getFullYear()}`;

  return loadShell({
    usuarios: [
      ['id_whatsapp', 'nome', 'data', 'role', 'numero', 'uuid'],
      ['111@c.us', 'Rafa', new Date(), '', '5511999', 'uuid-rafa'],
    ],
    jogos: [
      ['id', 'fase', 'mandante', 'visitante', 'data', 'hora', 'gols_mandante', 'gols_visitante', 'status'],
      [1, 'Grupos', 'BRA', 'SUI', tomorrowStr, '13:00', '', '', 'agendado'],
    ],
  });
}

const FROM = '111@c.us';

describe('bolão — /jogos', () => {
  it('lists tomorrow’s match', () => {
    const { post } = setup();
    const out = post({ Body: '/jogos', From: FROM });
    expect(out).toContain('Bolão da Copa');
    expect(out).toContain('BRA x'); // sigla + flag rendered (🇧🇷 BRA x 🇨🇭 SUI)
    expect(out).toContain('SUI');
    expect(out).toContain('Amanhã');
  });
});

describe('bolão — /palpite', () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => { env = setup(); });

  it('registers a prediction and stores one row', () => {
    const out = env.post({ Body: '/palpite BRAxSUI 2x1', From: FROM });
    expect(out).toContain('Palpite registrado');
    expect(out).toContain('BRA 2x1');
    expect(out).toContain('SUI');

    const rows = env.rowsOf('palpites');
    expect(rows.length).toBe(1);
    expect(rows[0][0]).toBe('uuid-rafa'); // uuid
    expect(rows[0][2]).toBe(2);            // gols_mandante
    expect(rows[0][3]).toBe(1);            // gols_visitante
  });

  it('updates the existing prediction instead of duplicating', () => {
    env.post({ Body: '/palpite BRAxSUI 2x1', From: FROM });
    env.post({ Body: '/palpite BRAxSUI 0x3', From: FROM });

    const rows = env.rowsOf('palpites');
    expect(rows.length).toBe(1);
    expect(rows[0][2]).toBe(0);
    expect(rows[0][3]).toBe(3);
  });

  it('rejects an unknown match pair', () => {
    const out = env.post({ Body: '/palpite XYZxABC 1x0', From: FROM });
    expect(out).toContain('Não achei');
    expect(env.rowsOf('palpites').length).toBe(0);
  });

  it('shows usage on malformed input', () => {
    const out = env.post({ Body: '/palpite BRA 1', From: FROM });
    expect(out).toContain('/palpite BRAxSUI 2x1');
  });

  it('requires the user to be registered', () => {
    const out = env.post({ Body: '/palpite BRAxSUI 2x1', From: '999@c.us' });
    expect(out).toContain('não está cadastrado');
  });
});

describe('bolão — /meuspalpites', () => {
  it('lists the prediction as pending before grading', () => {
    const env = setup();
    env.post({ Body: '/palpite BRAxSUI 2x1', From: FROM });

    const out = env.post({ Body: '/meuspalpites', From: FROM });
    expect(out).toContain('BRA 2x1');
    expect(out).toContain('SUI');
    expect(out).toContain('aguardando');
  });

  it('prompts when the user has no predictions', () => {
    const env = setup();
    const out = env.post({ Body: '/meuspalpites', From: FROM });
    expect(out).toContain('ainda não palpitou');
  });
});

// Grading scenario: a match played YESTERDAY (so it's gradeable), three
// predictions, and a workout for Rafa on the match day (he gets the ×2).
function setupGrading() {
  const now = new Date();
  const dayAt = (off: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
  const fmt = (dt: Date) =>
    `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  const yesterday = dayAt(-1);
  const tomorrow = dayAt(1);

  return loadShell({
    usuarios: [
      ['id_whatsapp', 'nome', 'data', 'role', 'numero', 'uuid'],
      ['admin@c.us', 'Chefe', new Date(), 'admin', '5511000', 'uuid-admin'],
      ['111@c.us', 'Rafa', new Date(), '', '5511999', 'uuid-rafa'],
      ['222@c.us', 'Bia', new Date(), '', '5511888', 'uuid-bia'],
      ['333@c.us', 'Dan', new Date(), '', '5511777', 'uuid-dan'],
    ],
    jogos: [
      ['id', 'fase', 'mandante', 'visitante', 'data', 'hora', 'gols_mandante', 'gols_visitante', 'status'],
      [1, 'Grupos', 'BRA', 'HAI', fmt(yesterday), '13:00', '', '', 'agendado'],
      [2, 'Grupos', 'ARG', 'AUT', fmt(tomorrow), '14:00', '', '', 'agendado'],
    ],
    palpites: [
      ['uuid', 'jogo_id', 'gols_mandante', 'gols_visitante', 'data_palpite', 'pontos_base', 'treinou', 'pontos_final'],
      ['uuid-rafa', 1, 2, 1, fmt(yesterday), '', '', ''], // exact
      ['uuid-bia', 1, 1, 0, fmt(yesterday), '', '', ''],  // right winner, wrong score
      ['uuid-dan', 1, 0, 2, fmt(yesterday), '', '', ''],  // wrong winner
    ],
    treinos: [
      ['uuid', 'nome', 'data', 'msgId'],
      ['uuid-rafa', 'Rafa', yesterday, 'm1'], // only Rafa trained on match day
    ],
  });
}

const ADMIN = 'admin@c.us';

describe('bolão — /resultado (grading)', () => {
  it('blocks non-admins', () => {
    const env = setupGrading();
    const out = env.post({ Body: '/resultado BRAxHAI 2x1', From: FROM });
    expect(out).toContain('Só admins');
    // nothing graded
    expect(env.rowsOf('palpites').every((r) => r[7] === '')).toBe(true);
  });

  it('refuses a match that has not started yet', () => {
    const env = setupGrading();
    const out = env.post({ Body: '/resultado ARGxAUT 1x0', From: ADMIN });
    expect(out).toContain('ainda não começou');
  });

  it('records the result and grades with the workout ×2 multiplier', () => {
    const env = setupGrading();
    const out = env.post({ Body: '/resultado BRAxHAI 2x1', From: ADMIN });
    expect(out).toContain('Resultado lançado');
    expect(out).toContain('3 palpites apurados');

    // jogos row: score + status
    const match = env.rowsOf('jogos').find((r) => r[0] === 1)!;
    expect(match[6]).toBe(2);            // gols_mandante
    expect(match[7]).toBe(1);            // gols_visitante
    expect(match[8]).toBe('encerrado');  // status

    // palpites: base | treinou | final
    const byUuid = (u: string) => env.rowsOf('palpites').find((r) => r[0] === u)!;
    expect(byUuid('uuid-rafa').slice(5, 8)).toEqual([4, 'sim', 8]); // exact + trained → ×2
    expect(byUuid('uuid-bia').slice(5, 8)).toEqual([2, 'não', 2]);  // winner, no training
    expect(byUuid('uuid-dan').slice(5, 8)).toEqual([0, 'não', 0]);  // wrong → 0
  });

  it('re-running corrects the grade', () => {
    const env = setupGrading();
    env.post({ Body: '/resultado BRAxHAI 2x1', From: ADMIN });
    env.post({ Body: '/resultado BRAxHAI 0x0', From: ADMIN }); // correction

    const rafa = env.rowsOf('palpites').find((r) => r[0] === 'uuid-rafa')!;
    expect(rafa.slice(5, 8)).toEqual([0, 'sim', 0]); // 2x1 is now wrong → 0
  });
});

describe('bolão — /bolao-regras', () => {
  it('lists the commands and the scoring rules', () => {
    const out = setup().post({ Body: '/bolao-regras', From: FROM });
    expect(out).toContain('Regras');
    // scoring (4/8 exact, 2/4 winner) derived from BOLAO_SCORING
    expect(out).toContain('Placar exato: *4 pts* (8');
    expect(out).toContain('*2 pts* (4');
    // mentions the player commands, but not the admin ones
    expect(out).toContain('/palpite');
    expect(out).toContain('/bolao');
    expect(out).not.toContain('/resultado');
    expect(out).not.toContain('/sincronizar');
  });
});

describe('bolão — /bolao (ranking)', () => {
  it('shows an empty state before any grading', () => {
    const env = setupGrading();
    expect(env.post({ Body: '/bolao', From: FROM })).toContain('Nenhum palpite pontuado');
  });

  it('ranks by final points after grading', () => {
    const env = setupGrading();
    env.post({ Body: '/resultado BRAxHAI 2x1', From: ADMIN });

    const out = env.post({ Body: '/bolao', From: FROM });
    expect(out).toContain('Rafa');
    expect(out).toContain('🥇 *Rafa* — 8 pts');
    // ordering: Rafa (8) > Bia (2) > Dan (0)
    expect(out.indexOf('Rafa')).toBeLessThan(out.indexOf('Bia'));
    expect(out.indexOf('Bia')).toBeLessThan(out.indexOf('Dan'));
  });
});

// Re-grade picks up a workout logged AFTER the first apuração (the ×2 was
// otherwise frozen). A finished match is seeded as graded-without-training
// (base 4 / final 4); after the workout exists, regrade must turn it into 8.
describe('bolão — regradeRecentMatches', () => {
  const pad = (n: number) => String(n).padStart(2, '0');

  function setupRegrade() {
    const now = new Date();
    const dayAt = (off: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
    const fmt = (dt: Date) => `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
    const yesterday = dayAt(-1);
    const old = dayAt(-5);

    return loadShell({
      usuarios: [
        ['id_whatsapp', 'nome', 'data', 'role', 'numero', 'uuid'],
        ['111@c.us', 'Rafa', new Date(), '', '5511999', 'uuid-rafa'],
      ],
      jogos: [
        ['id', 'fase', 'mandante', 'visitante', 'data', 'hora', 'gols_mandante', 'gols_visitante', 'status'],
        [1, 'Grupos', 'BRA', 'HAI', fmt(yesterday), '13:00', 2, 1, 'encerrado'],
        [2, 'Grupos', 'ARG', 'AUT', fmt(old), '16:00', 3, 0, 'encerrado'], // outside the window
      ],
      palpites: [
        ['uuid', 'jogo_id', 'gols_mandante', 'gols_visitante', 'data_palpite', 'pontos_base', 'treinou', 'pontos_final'],
        ['uuid-rafa', 1, 2, 1, fmt(yesterday), 4, 'não', 4], // exact, frozen without training
        ['uuid-rafa', 2, 3, 0, fmt(old), 4, 'não', 4],
      ],
      treinos: [
        ['uuid', 'nome', 'data', 'msgId'],
        ['uuid-rafa', 'Rafa', yesterday, 'm1'], // trained on the recent match's day
        ['uuid-rafa', 'Rafa', old, 'm2'],       // and on the old one's day
      ],
    });
  }

  it('applies the ×2 to a recent match once the workout exists', () => {
    const env = setupRegrade();
    env.app.regradeRecentMatches(new Date());

    const p1 = env.rowsOf('palpites').find((r) => r[1] === 1)!;
    expect(p1.slice(5, 8)).toEqual([4, 'sim', 8]); // re-graded with training
  });

  it('leaves matches outside the recent window untouched', () => {
    const env = setupRegrade();
    env.app.regradeRecentMatches(new Date());

    const p2 = env.rowsOf('palpites').find((r) => r[1] === 2)!;
    expect(p2.slice(5, 8)).toEqual([4, 'não', 4]); // 5 days old → not re-graded
  });
});

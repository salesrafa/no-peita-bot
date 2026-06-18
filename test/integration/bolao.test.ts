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
    expect(out).toContain('BRA x SUI');
    expect(out).toContain('Amanhã');
  });
});

describe('bolão — /palpite', () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => { env = setup(); });

  it('registers a prediction and stores one row', () => {
    const out = env.post({ Body: '/palpite BRAxSUI 2x1', From: FROM });
    expect(out).toContain('Palpite registrado');
    expect(out).toContain('BRA 2x1 SUI');

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
    expect(out).toContain('BRA 2x1 SUI');
    expect(out).toContain('aguardando');
  });

  it('prompts when the user has no predictions', () => {
    const env = setup();
    const out = env.post({ Body: '/meuspalpites', From: FROM });
    expect(out).toContain('ainda não palpitou');
  });
});

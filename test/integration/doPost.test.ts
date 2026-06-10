import { describe, it, expect } from 'vitest';
import { loadShell } from '../helpers/gasShell';

describe('doPost — auth', () => {
  it('rejects requests without the right token', () => {
    const { post } = loadShell();
    expect(post({ token: 'wrong', Body: '/hoje' })).toBe('unauthorized');
  });
});

describe('doPost — registration & scoring flow', () => {
  it('registers a user with a generated uuid', () => {
    const { post, rowsOf } = loadShell();
    const out = post({ Body: '/cadastro João', From: '111@c.us' });

    expect(out).toContain('Cadastro realizado com sucesso, João');
    const users = rowsOf('usuarios');
    expect(users).toHaveLength(1);
    expect(users[0][0]).toBe('111@c.us'); // id_whatsapp
    expect(users[0][1]).toBe('João');     // name
    expect(String(users[0][5])).toMatch(/^uuid-/); // uuid (col F)
  });

  it('scores a workout and blocks a duplicate same-day workout', () => {
    const { post, rowsOf } = loadShell();
    post({ Body: '/cadastro João', From: '111@c.us' });

    const first = post({ Body: '/pontuar', From: '111@c.us', MsgId: 'M1' });
    expect(first).toContain('Treino registrado com sucesso');
    expect(rowsOf('treinos')).toHaveLength(1);
    expect(rowsOf('treinos')[0][3]).toBe('M1'); // MsgId stored in col D

    const again = post({ Body: '/pontuar', From: '111@c.us', MsgId: 'M2' });
    expect(again).toContain('já registrou um treino hoje');
    expect(rowsOf('treinos')).toHaveLength(1); // not appended
  });

  it('/eu shows the monthly animal badge and /hoje and /ranking list the user', () => {
    const { post } = loadShell();
    post({ Body: '/cadastro João', From: '111@c.us' });
    post({ Body: '/pontuar', From: '111@c.us', MsgId: 'M1' });

    const eu = post({ Body: '/eu', From: '111@c.us' });
    expect(eu).toContain('🐔 *Frango*'); // 1 workout → Frango

    expect(post({ Body: '/hoje' })).toContain('João');

    const ranking = post({ Body: '/ranking', From: '111@c.us' });
    expect(ranking).toContain('*João* - 1 treino(s) - 🔥 1');
  });
});

describe('doPost — /apagar (admin gate)', () => {
  it('blocks non-admins', () => {
    const { post, rowsOf } = loadShell();
    post({ Body: '/cadastro João', From: '111@c.us' });
    post({ Body: '/pontuar', From: '111@c.us', MsgId: 'M1' });

    const out = post({ Body: '/apagar', From: '111@c.us', QuotedMsgId: 'M1' });
    expect(out).toContain('Só admins podem apagar treinos');
    expect(rowsOf('treinos')).toHaveLength(1); // not deleted
  });

  it('lets an admin delete the quoted workout', () => {
    const { post, rowsOf } = loadShell({
      usuarios: [
        ['id_whatsapp', 'nome', 'data', 'role', 'numero', 'uuid'],
        ['admin@c.us', 'Chefe', '', 'admin', '', 'uuid-admin'],
      ],
      treinos: [
        ['uuid', 'nome', 'data', 'msgId'],
        ['uuid-pedro', 'Pedro', new Date(2026, 5, 9), 'MID-9'],
      ],
    });

    const out = post({ Body: '/apagar', From: 'admin@c.us', QuotedMsgId: 'MID-9' });
    expect(out).toContain('Treino de Pedro');
    expect(out).toContain('apagado');
    expect(rowsOf('treinos')).toHaveLength(0);
  });

  it('admin quoting an unknown message gets a not-found reply', () => {
    const { post } = loadShell({
      usuarios: [
        ['id_whatsapp', 'nome', 'data', 'role', 'numero', 'uuid'],
        ['admin@c.us', 'Chefe', '', 'admin', '', 'uuid-admin'],
      ],
      treinos: [
        ['uuid', 'nome', 'data', 'msgId'],
        ['uuid-pedro', 'Pedro', new Date(2026, 5, 9), 'OTHER-MID'],
      ],
    });
    const out = post({ Body: '/apagar', From: 'admin@c.us', QuotedMsgId: 'does-not-exist' });
    expect(out).toContain('Não achei um treino');
  });
});

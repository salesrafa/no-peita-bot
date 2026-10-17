import { describe, it, expect } from 'vitest';
import { loadShell } from '../helpers/gasShell';

const USERS = [
  ['id_whatsapp', 'nome', 'data', 'role', 'numero', 'uuid'],
  ['111@c.us', 'Rafa', new Date(), '', '5511999', 'uuid-rafa'],
];

describe('perf instrumentation (doPost)', () => {
  it('logs exactly one perf line per authorized request, with stage timings', () => {
    const env = loadShell({ usuarios: USERS });
    env.post({ Body: '/pontuar', From: '111@c.us' });

    const perf = env.perfLogs();
    expect(perf).toHaveLength(1);
    expect(perf[0].cmd).toBe('/pontuar');
    for (const stage of ['authMs', 'logMessageMs', 'handlerMs', 'totalMs']) {
      expect(typeof perf[0].stages[stage]).toBe('number');
    }
  });

  it('records call counts and sheet row counts for the reads', () => {
    const env = loadShell({ usuarios: USERS });
    env.post({ Body: '/pontuar', From: '111@c.us' });
    const { calls, rows } = env.perfLogs()[0];

    expect(calls.readWorkouts).toBe(1);
    expect(calls['mensagens.appendRow']).toBe(1);
    expect(rows.getUserByIdentifier).toBe(2); // header + 1 user
    expect(calls.getUserByIdentifier).toBeGreaterThanOrEqual(1);
  });

  it('does not log perf for unauthorized requests', () => {
    const env = loadShell({ usuarios: USERS });
    env.app.doPost({ parameter: { token: 'wrong', Body: '/pontuar' } });
    expect(env.perfLogs()).toHaveLength(0);
  });

  it('resets the counters between requests', () => {
    const env = loadShell({ usuarios: USERS });
    env.post({ Body: '/ajuda', From: '111@c.us' });
    env.post({ Body: '/ajuda', From: '111@c.us' });
    const [first, second] = env.perfLogs();
    expect(second.calls).toEqual(first.calls);
  });
});

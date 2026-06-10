import { describe, it, expect } from 'vitest';
import { shouldHandleMessage } from '../../src/core/messageGate';

describe('shouldHandleMessage', () => {
  it('handles commands in production from anyone', () => {
    expect(shouldHandleMessage('/pontuar', '111@c.us', 'prod', [])).toBe(true);
  });

  it('ignores non-commands', () => {
    expect(shouldHandleMessage('oi pessoal', '111@c.us', 'prod', [])).toBe(false);
  });

  it('outside prod, only allowed contacts', () => {
    expect(shouldHandleMessage('/pontuar', '111@c.us', 'dev', [])).toBe(false);
    expect(shouldHandleMessage('/pontuar', '111@c.us', 'dev', ['111@c.us'])).toBe(true);
  });
});

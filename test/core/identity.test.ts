import { describe, it, expect } from 'vitest';
import { core } from '../helpers/gasCore';

const { resolveWorkoutUuid } = core;

describe('resolveWorkoutUuid', () => {
  const maps = {
    byKey: { 'lid-1': 'uuid-A', '5511999': 'uuid-A', 'uuid-B': 'uuid-B' },
    byName: { 'João': 'uuid-A' },
  };

  it('resolves by key (legacy id / number / uuid itself)', () => {
    expect(resolveWorkoutUuid('lid-1', 'João', maps)).toBe('uuid-A');
    expect(resolveWorkoutUuid('5511999', 'x', maps)).toBe('uuid-A');
    expect(resolveWorkoutUuid('uuid-B', '', maps)).toBe('uuid-B');
  });

  it('falls back to name when the key is empty/unknown', () => {
    expect(resolveWorkoutUuid('', 'João', maps)).toBe('uuid-A');
    expect(resolveWorkoutUuid('unknown', 'João', maps)).toBe('uuid-A');
  });

  it('trims whitespace', () => {
    expect(resolveWorkoutUuid('  lid-1  ', 'x', maps)).toBe('uuid-A');
  });

  it('returns the raw value when nothing matches (row is not lost)', () => {
    expect(resolveWorkoutUuid('zzz', 'Unknown', maps)).toBe('zzz');
    expect(resolveWorkoutUuid('', 'Unknown', maps)).toBe('Unknown');
  });
});

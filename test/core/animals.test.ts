import { describe, it, expect } from 'vitest';
import { core } from '../helpers/gasCore';

const { classifyAnimal, ANIMALS } = core;

describe('classifyAnimal', () => {
  it('has 13 tiers from Ovo (0) to Dragão (29+)', () => {
    expect(ANIMALS).toHaveLength(13);
    expect(ANIMALS[0].name).toBe('Ovo');
    expect(ANIMALS[0].min).toBe(0);
    expect(ANIMALS[12].name).toBe('Dragão');
    expect(ANIMALS[12].min).toBe(29);
  });

  it('0 workouts → Ovo, next Frango, remaining 1', () => {
    const r = classifyAnimal(0);
    expect(r.current.name).toBe('Ovo');
    expect(r.next.name).toBe('Frango');
    expect(r.remaining).toBe(1);
  });

  it('picks the highest tier reached (4 → Coelho, not Cachorro)', () => {
    const r = classifyAnimal(4); // Coelho is min 3, Cachorro min 5
    expect(r.current.name).toBe('Coelho');
    expect(r.next.name).toBe('Cachorro');
    expect(r.remaining).toBe(1);
  });

  it('15 → Onça 🐆', () => {
    const r = classifyAnimal(15);
    expect(r.current.name).toBe('Onça');
    expect(r.current.emoji).toBe('🐆');
  });

  it('28 → Leão, next is the secret Dragão (remaining 1)', () => {
    const r = classifyAnimal(28);
    expect(r.current.name).toBe('Leão');
    expect(r.next.name).toBe('Dragão');
    expect(r.next.secret).toBe(true);
    expect(r.remaining).toBe(1);
  });

  it('29+ → Dragão, no next, remaining 0', () => {
    for (const total of [29, 30, 100]) {
      const r = classifyAnimal(total);
      expect(r.current.name).toBe('Dragão');
      expect(r.current.secret).toBe(true);
      expect(r.next).toBeNull();
      expect(r.remaining).toBe(0);
    }
  });

  it('only Dragão is secret', () => {
    expect(ANIMALS.filter((a: any) => a.secret)).toHaveLength(1);
    expect(ANIMALS.find((a: any) => a.secret).name).toBe('Dragão');
  });
});

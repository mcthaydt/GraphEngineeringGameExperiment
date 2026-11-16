import { describe, expect, it } from 'vitest';
import { blipsFor } from '../../../src/features/sound/sound';

const total = (blips: ReturnType<typeof blipsFor>): number => blips.reduce((sum, b) => sum + b.gain, 0);

describe('sound', () => {
  it('lands harder, louder', () => {
    const soft = total(blipsFor({ type: 'land', speed: 5 }));
    const hard = total(blipsFor({ type: 'land', speed: 20 }));
    expect(hard).toBeGreaterThan(soft * 1.5);
    expect(hard).toBeLessThanOrEqual(0.2);
  });

  it('is silent for a landing too gentle to hear', () => {
    expect(blipsFor({ type: 'land', speed: 1 })).toEqual([]);
  });

  it('jumps higher in pitch and louder on a run than from standing still', () => {
    const still = blipsFor({ type: 'jump', speed: 0 })[0];
    const run = blipsFor({ type: 'jump', speed: 7 })[0];
    expect(run?.to).toBeGreaterThan(still?.to ?? Infinity);
    expect(run?.gain).toBeGreaterThan(still?.gain ?? Infinity);
  });

  it('uses only soft wave shapes', () => {
    for (const event of [{ type: 'jump', speed: 7 }, { type: 'land', speed: 15 }, { type: 'drop' }, { type: 'fall' }, { type: 'win' }] as const) {
      for (const blip of blipsFor(event)) expect(['sine', 'triangle']).toContain(blip.wave);
    }
  });

  it('plays the fall whistle when the hero drops, not when it is put back', () => {
    expect(blipsFor({ type: 'drop' }).length).toBeGreaterThan(0);
    expect(blipsFor({ type: 'fall' })).toEqual([]);
  });
});

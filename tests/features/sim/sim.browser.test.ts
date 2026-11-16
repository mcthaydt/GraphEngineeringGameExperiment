import { afterEach, describe, expect, it } from 'vitest';
import { loadFirstCourse, type Course } from '../../../src/features/course/course';
import { createSim, IDLE, type Intent, type Sim, type SimEvent } from '../../../src/features/sim/sim';
import { loadTuning } from '../../../src/features/tuning/tuning';

const tuning = loadTuning();
const flat: Course = {
  name: 'flat',
  fall_y: -5,
  start: { x: 0, y: 0, z: 0 },
  flag: { x: 0, y: 0, z: -8 },
  platforms: [
    { x: 0, y: 0, z: -4, width: 6, depth: 12, thickness: 1 },
    { x: 0, y: 0, z: -30, width: 6, depth: 6, thickness: 1 },
  ],
};

let sim: Sim;
afterEach(() => sim.dispose());

function run(steps: number, intent: Intent | ((step: number) => Intent)): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < steps; i++) events.push(...sim.step(typeof intent === 'function' ? intent(i) : intent));
  return events;
}
const forward: Intent = { moveX: 0, moveZ: -1, jump: false };
const settle = () => run(20, IDLE);

describe('sim', () => {
  it('stands on the start platform', () => {
    sim = createSim(flat, tuning);
    settle();
    const s = sim.snapshot();
    expect(s.grounded).toBe(true);
    expect(s.y).toBeCloseTo(0, 1);
    expect(s.groundY).toBeCloseTo(0, 1);
  });

  it('runs up to run speed and stops when the stick is let go', () => {
    sim = createSim({ ...flat, flag: { x: 0, y: 0, z: -30 } }, tuning);
    settle();
    run(30, forward);
    expect(sim.snapshot().vz).toBeCloseTo(-tuning.player.run_speed, 3);
    run(30, IDLE);
    expect(sim.snapshot().vz).toBe(0);
  });

  it('jumps higher when jump is held than when it is tapped', () => {
    const peak = (hold: number) => {
      sim = createSim(flat, tuning);
      settle();
      let top = 0;
      for (let i = 0; i < 90; i++) {
        sim.step({ moveX: 0, moveZ: 0, jump: i < hold });
        top = Math.max(top, sim.snapshot().y);
      }
      sim.dispose();
      return top;
    };
    const tap = peak(2);
    const hold = peak(60);
    sim = createSim(flat, tuning);
    expect(hold).toBeGreaterThan(1.8);
    expect(tap).toBeLessThan(hold * 0.6);
    expect(tap).toBeGreaterThan(0.3);
  });

  it('reports a jump and then a landing', () => {
    sim = createSim(flat, tuning);
    settle();
    const types = run(90, (i) => ({ moveX: 0, moveZ: 0, jump: i < 20 })).map((e) => e.type);
    expect(types).toEqual(['jump', 'land']);
  });

  it('still jumps just after running off an edge (coyote time)', () => {
    sim = createSim({ ...flat, flag: { x: 0, y: 0, z: -30 } }, tuning);
    settle();
    let left = -1;
    for (let i = 0; i < 200 && left < 0; i++) {
      sim.step(forward);
      if (!sim.snapshot().grounded) left = i;
    }
    expect(left).toBeGreaterThan(0);
    run(3, forward);
    const events = sim.step({ ...forward, jump: true });
    expect(events.map((e) => e.type)).toContain('jump');
  });

  it('puts the player back at the start after a fall, and counts it', () => {
    sim = createSim({ ...flat, flag: { x: 0, y: 0, z: -30 } }, tuning);
    settle();
    let fell = false;
    for (let i = 0; i < 400 && !fell; i++) fell = sim.step(forward).some((e) => e.type === 'fall');
    expect(fell).toBe(true);
    const s = sim.snapshot();
    expect(s.falls).toBe(1);
    expect(s.phase).toBe('playing');
    expect(s.z).toBeCloseTo(0, 5);
  });

  it('wins on reaching the flag, then ignores input until restart', () => {
    sim = createSim(flat, tuning);
    settle();
    const events = run(120, forward);
    expect(events.filter((e) => e.type === 'win')).toHaveLength(1);
    expect(sim.snapshot().phase).toBe('won');
    run(60, forward);
    expect(sim.snapshot().vz).toBe(0);
    sim.restart();
    const s = sim.snapshot();
    expect(s.phase).toBe('playing');
    expect(s.falls).toBe(0);
    expect(s.z).toBeCloseTo(0, 5);
  });

  it('plays the same every time for the same inputs', () => {
    const play = () => {
      const s = createSim(loadFirstCourse(), tuning);
      for (let i = 0; i < 600; i++) s.step({ moveX: Math.sin(i / 37) * 0.4, moveZ: -1, jump: i % 50 < 14 });
      const out = s.snapshot();
      s.dispose();
      return out;
    };
    sim = createSim(flat, tuning);
    expect(play()).toEqual(play());
  });
});

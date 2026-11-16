import { afterEach, describe, expect, it } from 'vitest';
import { loadFirstCourse, platformUnder, type Course } from '../../../src/features/course/course';
import { createSim, IDLE, type Intent, type Sim, type SimEvent } from '../../../src/features/sim/sim';
import { loadTuning } from '../../../src/features/tuning/tuning';
import { msToSteps } from '../../../src/lib/steps';
import { createAutopilot } from '../../playtest/autopilot';

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

  describe('after a respawn', () => {
    // The first frames after a restart or a fall must feel like any other start from rest.
    const speeds = (idle: number): number[] => {
      sim = createSim(loadFirstCourse(), tuning);
      run(idle, IDLE);
      return Array.from({ length: 12 }, () => {
        sim.step(forward);
        return Math.abs(sim.snapshot().vz);
      });
    };

    it('never loses speed while forward is held, whatever the wait before it', () => {
      for (const idle of [0, 1, 2, 3, 5, 8, 12, 20, 33, 60]) {
        const v = speeds(idle);
        v.forEach((speed, i) => expect(speed, `idle ${idle}, step ${i}`).toBeGreaterThanOrEqual((v[i - 1] ?? 0) - 1e-6));
        if (idle !== 60) sim.dispose();
      }
    });

    it('keeps accelerating after a fall with forward held, and a restart too', () => {
      sim = createSim({ ...flat, flag: { x: 0, y: 0, z: -30 } }, tuning);
      settle();
      let fell = false;
      for (let i = 0; i < 400 && !fell; i++) fell = sim.step(forward).some((e) => e.type === 'fall');
      let last = 0;
      for (let i = 0; i < 12; i++) {
        sim.step(forward);
        const v = Math.abs(sim.snapshot().vz);
        expect(v, `step ${i} after the fall`).toBeGreaterThanOrEqual(last - 1e-6);
        last = v;
      }
      sim.restart();
      last = 0;
      for (let i = 0; i < 12; i++) {
        sim.step(forward);
        const v = Math.abs(sim.snapshot().vz);
        expect(v, `step ${i} after the restart`).toBeGreaterThanOrEqual(last - 1e-6);
        last = v;
      }
    });

    it('does not count the start as a landing', () => {
      sim = createSim(flat, tuning);
      expect(run(30, IDLE).map((e) => e.type)).toEqual([]);
      sim.restart();
      expect(run(30, IDLE).map((e) => e.type)).toEqual([]);
    });
  });

  describe('edges', () => {
    it('lets go of the ground once the middle of the body is past the edge', () => {
      sim = createSim({ ...flat, flag: { x: 0, y: 0, z: -30 } }, tuning);
      settle();
      // A slow creep, as a thumb barely off centre: the player edges out to the edge at z = -10.
      let lastGroundedZ = 0;
      for (let i = 0; i < 2000; i++) {
        sim.step({ moveX: 0, moveZ: -0.12, jump: false });
        const s = sim.snapshot();
        if (!s.grounded) break;
        lastGroundedZ = s.z;
      }
      expect(lastGroundedZ).toBeLessThan(-8);
      expect(lastGroundedZ).toBeGreaterThan(-10.15);
    });

    it('lets go of a corner the same way', () => {
      sim = createSim({ ...flat, flag: { x: 0, y: 0, z: -30 } }, tuning);
      settle();
      // Creep to the back right corner (x = 3, z = 2), then past it.
      let lastGrounded = { x: 0, z: 0 };
      for (let i = 0; i < 2000; i++) {
        sim.step({ moveX: 0.1, moveZ: 0.1, jump: false });
        const s = sim.snapshot();
        if (!s.grounded) break;
        lastGrounded = { x: s.x, z: s.z };
      }
      expect(lastGrounded.x).toBeLessThan(3.15);
      expect(lastGrounded.z).toBeLessThan(2.15);
    });
  });

  describe('lips', () => {
    // A platform whose top is 0.2 m above the start's: a hero that only just fails to clear it is lifted on, not stopped.
    const lip: Course = {
      ...flat,
      flag: { x: 0, y: 0.2, z: -20 },
      platforms: [
        { x: 0, y: 0, z: -3, width: 6, depth: 10, thickness: 1 },
        { x: 0, y: 0.2, z: -13, width: 6, depth: 10, thickness: 1 },
      ],
    };

    it('climbs onto a platform whose edge it hits just below the top', () => {
      sim = createSim(lip, tuning);
      settle();
      run(120, forward);
      const s = sim.snapshot();
      expect(s.z).toBeLessThan(-9);
      expect(s.y).toBeCloseTo(0.2, 1);
    });

    it('does not climb a wall that is higher than a lip', () => {
      sim = createSim({ ...lip, platforms: [lip.platforms[0]!, { ...lip.platforms[1]!, y: 1 }] }, tuning);
      settle();
      run(120, forward);
      expect(sim.snapshot().z).toBeGreaterThan(-8.3);
    });
  });

  describe('jump timing', () => {
    const edgeOf = (): number => {
      sim = createSim({ ...flat, flag: { x: 0, y: 0, z: -30 } }, tuning);
      settle();
      let i = 0;
      while (sim.snapshot().grounded && i++ < 300) sim.step(forward);
      return i;
    };

    it('still jumps for as long as the coyote time says, and not a step longer', () => {
      const steps = msToSteps(tuning.player.coyote_ms);
      // `late` counts steps after the one that left the ground: 1 is the very next step.
      for (const late of [steps, steps + 1]) {
        edgeOf();
        run(late - 1, forward);
        const jumped = sim.step({ ...forward, jump: true }).some((e) => e.type === 'jump');
        expect(jumped, `${late} steps after the ground was lost`).toBe(late === steps);
        if (late === steps) sim.dispose();
      }
    });

    // Press jump `early` steps before the step the landing happens in, then see whether a second jump starts.
    const bufferedJump = (early: number, hold: boolean): { jumped: boolean; apex: number } => {
      sim = createSim(flat, tuning);
      settle();
      let air = 0;
      run(1, { moveX: 0, moveZ: 0, jump: true });
      while (!sim.snapshot().grounded && air++ < 200) sim.step(IDLE);
      sim.dispose();
      // `air` steps after the first jump the landing happens; replay and press again `early` steps before it.
      sim = createSim(flat, tuning);
      settle();
      sim.step({ moveX: 0, moveZ: 0, jump: true });
      for (let i = 1; i < air - early; i++) sim.step(IDLE);
      let jumped = false;
      let apex = 0;
      for (let i = 0; i < 60; i++) {
        const events = sim.step({ moveX: 0, moveZ: 0, jump: hold ? i < 30 : i === 0 });
        if (i > 0 || early === 0) jumped ||= events.some((e) => e.type === 'jump');
        apex = Math.max(apex, sim.snapshot().y);
      }
      return { jumped, apex };
    };

    it('remembers a jump pressed just before landing, for as long as the buffer time says', () => {
      const steps = msToSteps(tuning.player.jump_buffer_ms);
      expect(bufferedJump(steps, false).jumped).toBe(true);
      sim.dispose();
      expect(bufferedJump(steps + 3, false).jumped).toBe(false);
    });

    it('does not cut a buffered tap on its first step: it hops as high as a tap on the ground', () => {
      const buffered = bufferedJump(3, false);
      sim.dispose();
      sim = createSim(flat, tuning);
      settle();
      let tap = 0;
      for (let i = 0; i < 60; i++) {
        sim.step({ moveX: 0, moveZ: 0, jump: i === 0 });
        tap = Math.max(tap, sim.snapshot().y);
      }
      expect(buffered.apex).toBeGreaterThan(tap * 0.9);
    });
  });

  describe('falling', () => {
    // The course's own floor for falling is far below: the player is put back by how far it has dropped, not by that floor.
    const bottomless: Course = { ...flat, fall_y: -9, flag: { x: 0, y: 0, z: -30 } };
    const fallOff = (): { drop: number; fall: number; left: number } => {
      sim = createSim(bottomless, tuning);
      settle();
      let left = -1;
      let drop = -1;
      let fall = -1;
      for (let i = 0; i < 400 && fall < 0; i++) {
        const events = sim.step(forward);
        if (left < 0 && !sim.snapshot().grounded) left = i;
        if (events.some((e) => e.type === 'drop')) drop = i;
        if (events.some((e) => e.type === 'fall')) fall = i;
      }
      return { drop, fall, left };
    };

    it('says the player is dropping while it is still falling, before the cut back to the start', () => {
      const { drop, fall, left } = fallOff();
      expect(drop).toBeGreaterThan(left);
      expect(fall - drop).toBeGreaterThanOrEqual(8);
    });

    it('cuts back to the start within half a second of leaving the edge', () => {
      const { fall, left } = fallOff();
      expect(fall - left).toBeLessThanOrEqual(30);
    });

    it('says dropping only once per fall', () => {
      sim = createSim(bottomless, tuning);
      settle();
      const events = run(200, forward).filter((e) => e.type === 'drop');
      expect(events).toHaveLength(1);
    });
  });

  describe('weight', () => {
    const stepsToSpeed = (): number => {
      sim = createSim({ ...flat, flag: { x: 0, y: 0, z: -30 } }, tuning);
      settle();
      let n = 0;
      while (Math.abs(sim.snapshot().vz) < tuning.player.run_speed - 1e-3 && n < 100) {
        sim.step(forward);
        n++;
      }
      return n;
    };

    it('takes a short run-up to full speed: between 0.15 and 0.3 seconds', () => {
      const n = stepsToSpeed();
      expect(n).toBeGreaterThanOrEqual(9);
      expect(n).toBeLessThanOrEqual(18);
    });

    it('slides a short way to a stop: between 0.12 and 0.25 seconds', () => {
      stepsToSpeed();
      let n = 0;
      while (Math.abs(sim.snapshot().vz) > 1e-3 && n < 100) {
        sim.step(IDLE);
        n++;
      }
      expect(n).toBeGreaterThanOrEqual(8);
      expect(n).toBeLessThanOrEqual(15);
    });

    it('turns round in under a third of a second', () => {
      stepsToSpeed();
      let n = 0;
      while (sim.snapshot().vz < tuning.player.run_speed - 1e-3 && n < 100) {
        sim.step({ moveX: 0, moveZ: 1, jump: false });
        n++;
      }
      expect(n).toBeLessThanOrEqual(20);
    });
  });

  describe('the first course', () => {
    const course = loadFirstCourse();
    const play = (wish: (s: ReturnType<Sim['snapshot']>, edge: boolean) => Intent): { won: boolean; falls: number } => {
      sim = createSim(course, tuning);
      let falls = 0;
      for (let i = 0; i < 60 * 60 && sim.snapshot().phase !== 'won'; i++) {
        const s = sim.snapshot();
        const ahead = platformUnder(course, s.x, s.z - 0.9);
        sim.step(wish(s, !ahead || ahead.y > s.y + 0.2));
        falls = sim.snapshot().falls;
      }
      return { won: sim.snapshot().phase === 'won', falls };
    };

    it('is won by the autopilot, which steers and jumps', () => {
      const pilot = createAutopilot(course);
      const result = play((s) => {
        const w = pilot(s);
        return { moveX: (w.right ? 1 : 0) - (w.left ? 1 : 0), moveZ: (w.down ? 1 : 0) - (w.up ? 1 : 0), jump: w.jump };
      });
      expect(result.won).toBe(true);
    });

    it('is not won by only holding forward and holding jump at every edge', () => {
      // It steers sideways toward the next platform, as a new player would, but never lets go of forward or jump.
      const result = play((s, edge) => {
        const next = course.platforms.find((p) => p.z < s.z - 1) ?? course.flag;
        return { moveX: Math.sign(next.x - s.x) * (Math.abs(next.x - s.x) > 0.35 ? 1 : 0), moveZ: -1, jump: (s.grounded && edge) || (!s.grounded && s.vy > 0) };
      });
      expect(result.won).toBe(false);
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  arrivalBurst,
  bitLook,
  blink,
  brake,
  breath,
  cheerPose,
  cheerSparkles,
  confettiBurst,
  easeOutBack,
  FRAME,
  landingDust,
  runPose,
  shadowLook,
  skidDust,
  spring,
  stepBit,
  stepBrake,
  stepSpring,
  stepTumble,
  strideRate,
  takeoffDust,
  vanishBurst,
  type Bit,
} from '../../../src/features/scene/motion';
import { CONFETTI } from '../../../src/features/scene/palette';

const DT = 1 / 60;

describe('spring', () => {
  it('settles on its target without blowing up, even with a long frame', () => {
    const s = spring(0);
    for (let i = 0; i < 120; i++) stepSpring(s, 1, 260, 16, i === 7 ? 0.1 : DT);
    expect(s.value).toBeCloseTo(1, 3);
    expect(Number.isFinite(s.velocity)).toBe(true);
    expect(Math.abs(s.velocity)).toBeLessThan(1e-2);
  });

  it('overshoots once when lightly damped, so a landing wobbles', () => {
    const s = spring(0);
    let peak = 0;
    for (let i = 0; i < 120; i++) {
      stepSpring(s, 1, 260, 12, DT);
      peak = Math.max(peak, s.value);
    }
    expect(peak).toBeGreaterThan(1.05);
  });

  it('plays the same every time', () => {
    const run = (): number => {
      const s = spring(0.3);
      for (let i = 0; i < 50; i++) stepSpring(s, -1, 200, 9, DT);
      return s.value;
    };
    expect(run()).toBe(run());
  });
});

describe('easeOutBack', () => {
  it('starts at 0, ends at 1 and swells past 1 on the way', () => {
    expect(easeOutBack(0)).toBe(0);
    expect(easeOutBack(1)).toBeCloseTo(1, 10);
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1.03);
    expect(easeOutBack(-1)).toBe(0);
    expect(easeOutBack(5)).toBeCloseTo(1, 10);
  });
});

describe('shadowLook', () => {
  it('is darkest and widest on the ground, then softer and smaller the higher the player is', () => {
    const near = shadowLook(0);
    const mid = shadowLook(2);
    const far = shadowLook(6);
    expect(near.scale).toBeGreaterThan(mid.scale);
    expect(mid.scale).toBeGreaterThan(far.scale - 1e-9);
    expect(near.alpha).toBeGreaterThan(mid.alpha);
    expect(mid.alpha).toBeGreaterThan(far.alpha - 1e-9);
  });

  it('never vanishes or goes wild, so it stays the landing cue', () => {
    for (const h of [-1, 0, 1, 3, 10, 100]) {
      const look = shadowLook(h);
      expect(look.scale).toBeGreaterThanOrEqual(0.4);
      expect(look.scale).toBeLessThanOrEqual(1.2);
      expect(look.alpha).toBeGreaterThanOrEqual(0.25);
      expect(look.alpha).toBeLessThanOrEqual(0.7);
    }
  });
});

describe('bits', () => {
  const alive = (bits: Bit[], seconds: number): Bit[] => {
    const copy = bits.map((b) => ({ ...b }));
    for (let t = 0; t < seconds; t += DT) for (const b of copy) stepBit(b, DT);
    return copy;
  };

  it('stepBit moves a bit, ages it and says when it is over', () => {
    const [first] = landingDust(0, 0, 0, 10);
    const bit = { ...(first as Bit) };
    const x = bit.x;
    expect(stepBit(bit, DT)).toBe(true);
    expect(bit.age).toBeCloseTo(DT, 10);
    expect(bit.x).not.toBe(x);
    let more = true;
    for (let t = 0; t < 5 && more; t += DT) more = stepBit(bit, DT);
    expect(more).toBe(false);
  });

  it('drag slows a bit down and gravity pulls it', () => {
    const slow = { ...(landingDust(0, 0, 0, 10)[0] as Bit), vx: 4, vy: 0, vz: 0, gravity: 0, drag: 5 };
    for (let i = 0; i < 30; i++) stepBit(slow, DT);
    expect(Math.abs(slow.vx)).toBeLessThan(2);
    const heavy = { ...(confettiBurst(0, 0, 0)[0] as Bit), vy: 0, drag: 0, gravity: 9 };
    stepBit(heavy, DT);
    expect(heavy.vy).toBeLessThan(0);
  });

  it('landing dust is a ring of soft puffs that start small, grow and fade out', () => {
    const bits = landingDust(1, 2, 3, 10).filter((b) => b.kind === 'puff');
    expect(bits.length).toBeGreaterThanOrEqual(6);
    expect(bits.length).toBeLessThanOrEqual(9);
    const sizes = bits.map((b) => b.size1);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(0.3);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(0.6);
    const mid = bitLook({ ...(bits[0] as Bit), age: (bits[0] as Bit).life * 0.4 });
    const start = bitLook({ ...(bits[0] as Bit), age: 0 });
    const end = bitLook({ ...(bits[0] as Bit), age: (bits[0] as Bit).life * 0.999 });
    expect(mid.size).toBeGreaterThan(start.size);
    expect(start.alpha).toBeGreaterThan(0.5);
    expect(start.alpha).toBeLessThanOrEqual(0.85);
    expect(end.alpha).toBeLessThan(0.05);
    // They spread low along the ground, not up into the sky.
    const settled = alive(bits, 0.3);
    for (const b of settled) {
      expect(b.y).toBeLessThan(2 + 0.9);
      expect(Math.hypot(b.x - 1, b.z - 3)).toBeGreaterThan(0.4);
    }
  });

  it('a harder landing throws more dust, within limits', () => {
    expect(landingDust(0, 0, 0, 25).length).toBeGreaterThan(landingDust(0, 0, 0, 4).length);
    expect(landingDust(0, 0, 0, 1000).length).toBeLessThanOrEqual(10);
    expect(landingDust(0, 0, 0, 0).length).toBeGreaterThanOrEqual(7);
  });

  it('dust is a pale warm grey, never pure white', () => {
    for (const b of [...landingDust(0, 0, 0, 12), ...takeoffDust(0, 0, 0)]) {
      expect(b.color).not.toBe(0xffffff);
      const r = (b.color >> 16) & 255;
      const blue = b.color & 255;
      expect(r).toBeGreaterThan(200);
      expect(r).toBeGreaterThanOrEqual(blue);
    }
  });

  it('take-off dust is a smaller kick than a landing', () => {
    const take = takeoffDust(0, 0, 0);
    expect(take.length).toBeGreaterThanOrEqual(3);
    expect(take.length).toBeLessThan(landingDust(0, 0, 0, 12).length);
    expect(take.every((b) => b.kind === 'puff')).toBe(true);
  });

  it('landing also puts a ring on the ground', () => {
    const ring = landingDust(0, 0, 0, 12).filter((b) => b.kind === 'ring');
    expect(ring).toHaveLength(1);
    const look = (age: number): ReturnType<typeof bitLook> => bitLook({ ...(ring[0] as Bit), age });
    expect(look(0.2).size).toBeGreaterThan(look(0).size);
  });

  it('confetti has real area, many colours, two faces and a flutter that never vanishes', () => {
    const bits = confettiBurst(0, 3, -50);
    expect(bits).toHaveLength(80);
    expect(bits.every((b) => b.kind === 'confetti')).toBe(true);
    for (const b of bits) {
      expect(b.size0).toBeGreaterThanOrEqual(0.16);
      expect(b.size0).toBeLessThanOrEqual(0.3);
      expect(CONFETTI).toContain(b.color);
    }
    expect(new Set(bits.map((b) => b.color)).size).toBe(CONFETTI.length);
    const frames = new Set<number>();
    const lights = new Set<number>();
    for (let t = 0; t < 1; t += DT) {
      const look = bitLook({ ...(bits[3] as Bit), age: t });
      frames.add(look.frame);
      lights.add(look.color);
      expect(look.size).toBeGreaterThan(0.1);
    }
    expect(frames).toEqual(new Set([FRAME.chip, FRAME.chipEdge]));
    expect(lights.size).toBeGreaterThan(1);
  });

  it('confetti drifts down slowly after the first burst, so it can be watched', () => {
    const bits = alive(confettiBurst(0, 3, -50), 1.5);
    const speeds = bits.map((b) => Math.hypot(b.vx, b.vy, b.vz));
    expect(Math.max(...speeds)).toBeLessThan(7);
  });

  it('celebration confetti is spread out and goes high enough to be seen above a button', () => {
    const bits = confettiBurst(0, 3, -50);
    const peaks = alive(bits, 0.6).map((b) => b.y);
    expect(Math.max(...peaks)).toBeGreaterThan(6);
    const xs = bits.map((b) => b.vx);
    expect(Math.min(...xs)).toBeLessThan(-2);
    expect(Math.max(...xs)).toBeGreaterThan(2);
  });

  it('arrival is a ring and a few sparkles that stay around the hero', () => {
    const bits = arrivalBurst(0, 0, 0);
    expect(bits.filter((b) => b.kind === 'ring')).toHaveLength(1);
    const stars = bits.filter((b) => b.kind === 'star');
    expect(stars.length).toBeGreaterThanOrEqual(6);
    expect(stars.length).toBeLessThanOrEqual(8);
    for (const b of alive(stars, 0.2)) expect(Math.hypot(b.x, b.y - 0.6, b.z)).toBeLessThan(2.5);
  });

  it('vanishing leaves an exit puff ring', () => {
    const bits = vanishBurst(3, -4, -8);
    expect(bits.some((b) => b.kind === 'ring')).toBe(true);
    expect(bits.some((b) => b.kind === 'puff')).toBe(true);
    expect(bits.length).toBeLessThanOrEqual(10);
  });

  it('cheer sparkles are gold stars around the hero', () => {
    const bits = cheerSparkles(0, 3, -55);
    expect(bits.length).toBeGreaterThanOrEqual(8);
    expect(bits.every((b) => b.kind === 'star')).toBe(true);
  });

  it('is the same every time: no randomness anywhere', () => {
    expect(confettiBurst(1, 2, 3)).toEqual(confettiBurst(1, 2, 3));
    expect(landingDust(1, 2, 3, 9)).toEqual(landingDust(1, 2, 3, 9));
    expect(arrivalBurst(1, 2, 3)).toEqual(arrivalBurst(1, 2, 3));
  });
});

describe('hero motion', () => {
  it('blinks briefly now and then and is open the rest of the time', () => {
    const open = Array.from({ length: 600 }, (_, i) => blink(i * DT));
    expect(Math.min(...open)).toBe(0);
    expect(Math.max(...open)).toBeGreaterThan(0.9);
    expect(open.filter((v) => v > 0).length).toBeLessThan(40);
  });

  it('cheers by hopping high, spinning round, and landing back on the ground', () => {
    const poses = Array.from({ length: 200 }, (_, i) => cheerPose(i * DT));
    expect(Math.max(...poses.map((p) => p.hop))).toBeGreaterThan(1.6);
    expect(Math.min(...poses.map((p) => p.hop))).toBe(0);
    expect(poses[199]?.spin).toBeGreaterThan(Math.PI * 2);
  });

  it('does not tumble until it has really been falling, then spins faster and faster', () => {
    const t = { falling: 0, angle: 0 };
    stepTumble(t, true, DT);
    stepTumble(t, true, DT);
    expect(t.angle).toBe(0);
    for (let i = 0; i < 20; i++) stepTumble(t, true, DT);
    const early = t.angle;
    expect(early).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) stepTumble(t, true, DT);
    expect(t.angle - early).toBeGreaterThan(early);
  });

  it('stops tumbling the moment it is no longer falling', () => {
    const t = { falling: 1, angle: 3 };
    stepTumble(t, false, DT);
    expect(t.falling).toBe(0);
    expect(t.angle).toBe(0);
  });
});

describe('the run seen from behind', () => {
  it('has a cadence of 3 to 4 strides a second at top speed, slower when slower', () => {
    expect(strideRate(7)).toBeGreaterThanOrEqual(3);
    expect(strideRate(7)).toBeLessThanOrEqual(4);
    expect(strideRate(3)).toBeLessThan(strideRate(7));
    expect(strideRate(3)).toBeGreaterThan(0);
  });

  it('repeats every full stride', () => {
    const a = runPose(0.37, 7);
    const b = runPose(1.37, 7);
    for (const key of Object.keys(a) as (keyof typeof a)[]) expect(a[key]).toBeCloseTo(b[key], 6);
  });

  it('rolls and sways from side to side with the step, as a wave', () => {
    const left = runPose(0.25, 7);
    const right = runPose(0.75, 7);
    expect(left.roll).toBeCloseTo(0.12, 5);
    expect(right.roll).toBeCloseTo(-0.12, 5);
    expect(left.sway).toBeGreaterThanOrEqual(0.05);
    expect(right.sway).toBeCloseTo(-left.sway, 5);
    expect(left.yaw).toBeCloseTo(-right.yaw, 5);
    expect(left.armSide).toBeGreaterThan(0.2);
    expect(left.armSide).toBeCloseTo(-right.armSide, 5);
    expect(runPose(0, 7).roll).toBeCloseTo(0, 5);
  });

  it('bounces twice a stride, as high as 0.12 m, and lifts each foot 0.25 m in turn', () => {
    expect(runPose(0, 7).bob).toBeCloseTo(0.12, 5);
    expect(runPose(0.5, 7).bob).toBeCloseTo(0.12, 5);
    expect(runPose(0.25, 7).bob).toBeCloseTo(0, 5);
    expect(runPose(0, 7).footLift).toBeCloseTo(0.25, 5);
    // One foot rises, then the other: the rising foot swaps every half stride.
    expect(runPose(0, 7).rise).toBeCloseTo(1, 5);
    expect(runPose(0.5, 7).rise).toBeCloseTo(-1, 5);
  });

  it('keeps its shape at a walk but with smaller movements, and never flatter than a third', () => {
    const walk = runPose(0.25, 2);
    const run = runPose(0.25, 7);
    expect(walk.roll).toBeLessThan(run.roll);
    expect(walk.roll).toBeGreaterThanOrEqual(run.roll * 0.34);
    expect(runPose(0.25, 20).roll).toBeCloseTo(run.roll, 5);
  });
});

describe('breathing', () => {
  it('rises and falls slowly by under 2 per cent', () => {
    const values = Array.from({ length: 400 }, (_, i) => breath(i * 0.025));
    expect(Math.max(...values)).toBeGreaterThan(0.015);
    expect(Math.max(...values)).toBeLessThan(0.02);
    expect(Math.min(...values)).toBeLessThan(-0.015);
    expect(breath(0)).toBe(0);
    expect(breath(1.3)).toBe(breath(1.3));
  });
});

describe('braking', () => {
  const drive = (b: ReturnType<typeof brake>, speeds: number[], grounded = true): void => {
    for (const speed of speeds) stepBrake(b, speed, grounded, DT);
  };

  it('does nothing while running steadily or walking', () => {
    const b = brake();
    drive(b, [7, 7, 7, 7, 7, 7, 7, 7]);
    drive(b, [6.8, 6.6, 6.4, 6.2, 6]);
    const walk = brake();
    drive(walk, [2, 2.2, 2.4, 2.4]);
    expect(walk.count).toBe(0);
    expect(b.count).toBe(0);
    expect(b.tilt).toBeLessThan(0.01);
  });

  it('tips back and counts one skid when a run stops hard', () => {
    const b = brake();
    drive(b, [7, 7, 7, 5.5, 4, 2.5, 1, 0, 0, 0]);
    expect(b.count).toBe(1);
    expect(b.tilt).toBeGreaterThan(0.5);
  });

  it('counts a turn-around as a skid too, and one stop only once', () => {
    const b = brake();
    drive(b, [7, 7, 5.5, 4, 2.5, 1, 0, 1.5, 3, 4.5, 6, 7]);
    expect(b.count).toBe(1);
  });

  it('stays upright in the air and when it was slow already', () => {
    const air = brake();
    drive(air, [7, 7, 7, 5.5, 4, 2.5, 1, 0], false);
    expect(air.count).toBe(0);
    const slow = brake();
    drive(slow, [2.5, 1, 0, 0]);
    expect(slow.count).toBe(0);
  });

  it('settles upright again a moment after the stop', () => {
    const b = brake();
    drive(b, [7, 5.5, 4, 2.5, 1, 0]);
    drive(b, Array<number>(40).fill(0));
    expect(b.tilt).toBeLessThan(0.02);
  });

  it('lets a second stop start another skid once the first is over', () => {
    const b = brake();
    drive(b, [7, 5.5, 4, 2.5, 1, 0]);
    drive(b, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.5, 3, 4.5, 6, 7, 7, 7]);
    drive(b, [5.5, 4, 2.5, 1, 0]);
    expect(b.count).toBe(2);
  });
});

describe('skid dust', () => {
  it('is two soft puffs near the feet, one each way, and the same every time', () => {
    const bits = skidDust(1, 2, 3);
    expect(bits).toHaveLength(2);
    for (const b of bits) {
      expect(b.kind).toBe('puff');
      expect(Math.hypot(b.x - 1, b.z - 3)).toBeLessThan(0.6);
      expect(b.y).toBeGreaterThan(2);
      expect(b.y).toBeLessThan(2.5);
    }
    expect(Math.sign(bits[0]?.vx ?? 0)).toBe(-Math.sign(bits[1]?.vx ?? 0));
    expect(skidDust(1, 2, 3)).toEqual(bits);
  });
});

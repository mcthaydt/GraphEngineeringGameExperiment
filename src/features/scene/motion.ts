import { clamp, lerp } from '../../lib/maths';
import { CONFETTI, PALETTE } from './palette';

// Pure motion maths for the hero and the effects: springs, timers and particles. Nothing here draws, and nothing
// is random, so the same inputs always make the same picture.

export interface Spring {
  value: number;
  velocity: number;
}

export const spring = (value = 0): Spring => ({ value, velocity: 0 });

/** A damped spring toward `target`, in small steps so one long frame cannot make it blow up. */
export function stepSpring(s: Spring, target: number, stiffness: number, damping: number, dt: number): void {
  const steps = Math.max(1, Math.ceil(dt * 120));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    s.velocity += (-(s.value - target) * stiffness - s.velocity * damping) * h;
    s.value += s.velocity * h;
  }
}

/** 0 to 1 with a little overshoot, for things that pop into place. */
export function easeOutBack(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/** The round shadow: big and dark on the ground, smaller and fainter the higher the player is, but always there. */
export function shadowLook(height: number): { scale: number; alpha: number } {
  const h = Math.max(0, height);
  return { scale: clamp(1.1 - h * 0.1, 0.5, 1.1), alpha: clamp(0.62 - h * 0.07, 0.3, 0.62) };
}

/** Which picture in the effects sheet a bit uses. */
export const FRAME = { puff: 0, ring: 1, star: 2, chip: 3, chipEdge: 4, shade: 5 } as const;

export interface Bit {
  readonly kind: 'puff' | 'ring' | 'star' | 'confetti';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  readonly life: number;
  readonly size0: number;
  readonly size1: number;
  readonly alpha: number;
  /** Spin in the picture's plane, radians per second. */
  readonly spin: number;
  readonly gravity: number;
  /** Share of speed lost per second. */
  readonly drag: number;
  readonly color: number;
}

const bit = (kind: Bit['kind'], x: number, y: number, z: number, rest: Partial<Bit> & Pick<Bit, 'life' | 'size0' | 'size1' | 'color'>): Bit => ({
  kind,
  x,
  y,
  z,
  vx: 0,
  vy: 0,
  vz: 0,
  age: 0,
  alpha: 1,
  spin: 0,
  gravity: 0,
  drag: 0,
  ...rest,
});

/** Moves a bit on by `dt`. Returns false once its life is over. */
export function stepBit(b: Bit, dt: number): boolean {
  const keep = Math.exp(-b.drag * dt);
  b.vx *= keep;
  b.vz *= keep;
  b.vy = b.vy * keep - b.gravity * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;
  b.age += dt;
  return b.age < b.life;
}

const mix = (a: number, b: number, t: number): number => {
  const channel = (shift: number): number => Math.round(lerp((a >> shift) & 255, (b >> shift) & 255, t)) << shift;
  return channel(16) | channel(8) | channel(0);
};

export interface BitLook {
  readonly size: number;
  readonly alpha: number;
  readonly rotation: number;
  readonly frame: number;
  readonly color: number;
}

/** How a bit looks at its age: puffs swell and fade, rings spread, stars pop and twinkle, confetti flutters. */
export function bitLook(b: Bit): BitLook {
  const t = clamp(b.age / b.life, 0, 1);
  const out = 1 - (1 - t) ** 2;
  switch (b.kind) {
    case 'puff':
      return { size: lerp(b.size0, b.size1, out), alpha: b.alpha * (1 - t) ** 1.5, rotation: b.spin * b.age, frame: FRAME.puff, color: b.color };
    case 'ring':
      return { size: lerp(b.size0, b.size1, out), alpha: b.alpha * (1 - t) ** 1.2, rotation: 0, frame: FRAME.ring, color: b.color };
    case 'star': {
      const pop = t < 0.25 ? easeOutBack(t / 0.25) : 1 - ((t - 0.25) / 0.75) ** 2;
      const twinkle = 0.85 + 0.15 * Math.sin(b.age * 30);
      return { size: b.size0 * Math.max(0, pop) * twinkle, alpha: b.alpha * Math.min(1, (1 - t) * 3), rotation: b.spin * b.age, frame: FRAME.star, color: b.color };
    }
    case 'confetti': {
      // Each piece turns over as it falls: wide when it faces us, a sliver when it is edge on, bright or dark by face.
      const turn = b.spin * 0.7 * b.age + b.size0 * 40;
      const face = Math.cos(turn);
      const shrink = Math.min(1, (1 - t) * 5);
      return {
        size: b.size0 * (0.55 + 0.45 * shrink),
        alpha: Math.min(1, (1 - t) * 5),
        rotation: b.spin * b.age + b.size0 * 20,
        frame: Math.abs(face) < 0.3 ? FRAME.chipEdge : FRAME.chip,
        color: face > 0 ? b.color : mix(b.color, 0x101018, 0.32),
      };
    }
  }
}

/** A ring of soft puffs rolling out along the ground, and a ring on the ground itself. Harder landings throw more. */
export function landingDust(x: number, y: number, z: number, speed: number): Bit[] {
  const count = clamp(Math.round(6 + speed * 0.15), 6, 9);
  const puffs = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + 0.3;
    return bit('puff', x + Math.cos(angle) * 0.3, y + 0.16, z + Math.sin(angle) * 0.3, {
      vx: Math.cos(angle) * (3.2 + (i % 3) * 0.4),
      vy: 0.5,
      vz: Math.sin(angle) * (3.2 + (i % 3) * 0.4),
      drag: 4.5,
      life: 0.5 + (i % 3) * 0.08,
      size0: 0.24,
      size1: 0.44 + (i % 3) * 0.06,
      alpha: 0.85,
      spin: (i % 2 === 0 ? 1 : -1) * 1.2,
      color: PALETTE.dust,
    });
  });
  const ring = bit('ring', x, y + 0.05, z, { life: 0.45, size0: 0.6, size1: 2.6, alpha: 0.6, color: PALETTE.dustRing });
  return [...puffs, ring];
}

/** A small kick of dust behind the feet as they leave the ground. */
export function takeoffDust(x: number, y: number, z: number): Bit[] {
  return Array.from({ length: 4 }, (_, i) => {
    const angle = (i / 4) * Math.PI * 2 + 0.8;
    return bit('puff', x + Math.cos(angle) * 0.35, y + 0.16, z + Math.sin(angle) * 0.35, {
      vx: Math.cos(angle) * 1.6,
      vy: 0.6,
      vz: Math.sin(angle) * 1.6,
      drag: 4,
      life: 0.45,
      size0: 0.22,
      size1: 0.5,
      alpha: 0.8,
      spin: 1,
      color: PALETTE.dust,
    });
  });
}

/** The win: a fountain of paper pieces that go high and then flutter down slowly. */
export function confettiBurst(x: number, y: number, z: number): Bit[] {
  return Array.from({ length: 80 }, (_, i) => {
    // A fixed spread, not random, so a replay looks the same.
    const angle = i * 2.399;
    const out = 1.5 + (i % 5) * 0.8;
    return bit('confetti', x + Math.cos(angle) * 0.4, y + 1.2, z + Math.sin(angle) * 0.4, {
      vx: Math.cos(angle) * out,
      vy: 8 + (i % 8) * 1.1,
      vz: Math.sin(angle) * out * 0.8,
      spin: 5 + (i % 4) * 3,
      life: 3,
      size0: 0.22 + (i % 4) * 0.025,
      size1: 0.22,
      gravity: 4.5,
      drag: 1.8,
      color: CONFETTI[i % CONFETTI.length] ?? PALETTE.gold,
    });
  });
}

const stars = (x: number, y: number, z: number, count: number, reach: number, life: number): Bit[] =>
  Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + 0.5;
    return bit('star', x + Math.cos(angle) * 0.5, y + 0.6 + (i % 2) * 0.4, z + Math.sin(angle) * 0.5, {
      vx: Math.cos(angle) * reach,
      vy: 1.2 + (i % 3) * 0.4,
      vz: Math.sin(angle) * reach,
      drag: 3,
      life,
      size0: 0.4 + (i % 3) * 0.12,
      size1: 0.1,
      spin: (i % 2 === 0 ? 1 : -1) * 2,
      color: i % 3 === 0 ? PALETTE.cream : PALETTE.starGold,
    });
  });

/** Coming back after a fall: a ring spreading on the ground and a few sparkles round the hero. */
export function arrivalBurst(x: number, y: number, z: number): Bit[] {
  return [
    bit('ring', x, y + 0.05, z, { life: 0.6, size0: 0.5, size1: 3.2, alpha: 0.85, color: PALETTE.starGold }),
    ...stars(x, y, z, 7, 1.8, 0.7),
  ];
}

/** Leaving the picture: a ring and a few puffs where the hero was last seen. */
export function vanishBurst(x: number, y: number, z: number): Bit[] {
  const puffs = Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 5) * Math.PI * 2;
    return bit('puff', x, y, z, {
      vx: Math.cos(angle) * 2.4,
      vy: 0.6,
      vz: Math.sin(angle) * 2.4,
      drag: 3.5,
      life: 0.55,
      size0: 0.3,
      size1: 0.7,
      alpha: 0.7,
      color: PALETTE.cloud,
    });
  });
  return [bit('ring', x, y, z, { life: 0.5, size0: 0.4, size1: 2.4, alpha: 0.7, color: PALETTE.cloud }), ...puffs];
}

/** Gold stars popping round the hero as it cheers. */
export function cheerSparkles(x: number, y: number, z: number): Bit[] {
  return stars(x, y, z, 10, 2.6, 0.9);
}

const BLINK_EVERY = 3.4;
const BLINK_FOR = 0.16;

/** How shut the eyes are at this time: open almost always, a quick blink every few seconds. */
export function blink(clock: number): number {
  const phase = clock % BLINK_EVERY;
  return phase < BLINK_FOR ? Math.sin((phase / BLINK_FOR) * Math.PI) : 0;
}

/** Seconds for one victory hop. */
export const HOP_EVERY = 1.1;
const HOP_HEIGHT = 3;

/** The victory dance: big hops with a full turn on each, `t` seconds in. */
export function cheerPose(t: number): { hop: number; spin: number } {
  const hops = Math.max(0, t) / HOP_EVERY;
  const u = hops % 1;
  const turn = u * u * (3 - 2 * u);
  return { hop: 4 * u * (1 - u) * HOP_HEIGHT, spin: (Math.floor(hops) + turn) * Math.PI * 2 };
}

const TUMBLE_AFTER = 0.12;

/** A fall that lasts starts to spin, faster the longer it goes. A short drop over a gap does nothing. */
export function stepTumble(t: { falling: number; angle: number }, falling: boolean, dt: number): void {
  if (!falling) {
    t.falling = 0;
    t.angle = 0;
    return;
  }
  t.falling += dt;
  if (t.falling > TUMBLE_AFTER) t.angle += (7 + (t.falling - TUMBLE_AFTER) * 14) * dt;
}

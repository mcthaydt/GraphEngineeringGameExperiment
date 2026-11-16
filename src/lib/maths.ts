export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Moves `current` toward `target` by at most `maxDelta`, never past it. */
export function approach(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  return Math.abs(delta) <= maxDelta ? target : current + Math.sign(delta) * maxDelta;
}

/** Frame-rate independent smoothing: `rate` per second, larger is snappier. */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-rate * dt));

/** Shortest signed turn from angle `a` to angle `b`, in radians. */
export function angleDelta(a: number, b: number): number {
  const turn = (b - a) % (Math.PI * 2);
  return turn > Math.PI ? turn - Math.PI * 2 : turn < -Math.PI ? turn + Math.PI * 2 : turn;
}

export const dampAngle = (current: number, target: number, rate: number, dt: number): number =>
  current + angleDelta(current, target) * (1 - Math.exp(-rate * dt));

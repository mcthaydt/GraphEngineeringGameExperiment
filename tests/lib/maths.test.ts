import { describe, expect, it } from 'vitest';
import { angleDelta, approach, clamp, damp } from '../../src/lib/maths';
import { createStepper, STEP_MS } from '../../src/lib/steps';

describe('maths', () => {
  it('approach never overshoots', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(0, -10, 3)).toBe(-3);
  });
  it('clamp and damp stay in range', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(damp(0, 1, 5, 0.1)).toBeGreaterThan(0);
    expect(damp(0, 1, 5, 0.1)).toBeLessThan(1);
  });
  it('angleDelta takes the short way round', () => {
    expect(angleDelta(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2);
  });
});

describe('stepper', () => {
  it('turns time into whole steps and keeps the remainder', () => {
    const stepper = createStepper();
    expect(stepper.feed(STEP_MS * 2.5)).toBe(2);
    expect(stepper.alpha).toBeCloseTo(0.5);
    expect(stepper.feed(STEP_MS * 0.5)).toBe(1);
  });
  it('drops a long stall instead of replaying it', () => {
    const stepper = createStepper(5);
    expect(stepper.feed(5000)).toBe(5);
    expect(stepper.feed(STEP_MS)).toBe(1);
  });
});

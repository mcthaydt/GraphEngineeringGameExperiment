import { describe, expect, it } from 'vitest';
import { createHints, IDLE_SECONDS, OOPS_SECONDS, type HintView } from '../../../src/features/screens/hints';

const START = { x: 0, z: 0 };
const fresh = (): HintView => ({ showMoveHint: true, showJumpHint: true, fell: false });
const run = (steps: number) => Array.from({ length: steps }, () => 1 / 60);

describe('hints', () => {
  it('starts with both hints showing', () => {
    const view = fresh();
    createHints(view, START);
    expect(view).toEqual({ showMoveHint: true, showJumpHint: true, fell: false });
  });

  it('ticks off moving once the hero has run a couple of metres, and jumping once it has jumped', () => {
    const view = fresh();
    const hints = createHints(view, START);
    hints.step(1 / 60, { x: 1, z: -1 }, true);
    expect(view.showMoveHint).toBe(true);
    hints.step(1 / 60, { x: 0, z: -3 }, true);
    expect(view.showMoveHint).toBe(false);
    expect(view.showJumpHint).toBe(true);
    hints.jumped();
    expect(view.showJumpHint).toBe(false);
  });

  it('brings both hints back after the player stands still for a while', () => {
    const view = fresh();
    const hints = createHints(view, START);
    hints.step(1 / 60, { x: 0, z: -3 }, true);
    hints.jumped();
    const there = { x: 0, z: -3 };
    for (const dt of run(Math.floor((IDLE_SECONDS - 0.5) * 60))) hints.step(dt, there, false);
    expect(view.showMoveHint || view.showJumpHint).toBe(false);
    for (const dt of run(60)) hints.step(dt, there, false);
    expect(view.showMoveHint).toBe(true);
    expect(view.showJumpHint).toBe(true);
  });

  it('does not count a player who keeps playing as lost', () => {
    const view = fresh();
    const hints = createHints(view, START);
    hints.step(1 / 60, { x: 0, z: -3 }, true);
    hints.jumped();
    for (let i = 0; i < IDLE_SECONDS * 3 * 60; i++) hints.step(1 / 60, { x: 0, z: -3 }, i % 120 < 60);
    expect(view.showMoveHint || view.showJumpHint).toBe(false);
  });

  it('keeps a returned move hint until the hero runs from where it stood, not from the start', () => {
    const view = fresh();
    const hints = createHints(view, START);
    hints.step(1 / 60, { x: 0, z: -10 }, true);
    hints.jumped();
    for (const dt of run(IDLE_SECONDS * 60 + 30)) hints.step(dt, { x: 0, z: -10 }, false);
    expect(view.showMoveHint).toBe(true);
    hints.step(1 / 60, { x: 0, z: -10.5 }, true);
    expect(view.showMoveHint).toBe(true);
    hints.step(1 / 60, { x: 0, z: -13 }, true);
    expect(view.showMoveHint).toBe(false);
  });

  it('says oops for a moment after a fall, and shows the hints again', () => {
    const view = fresh();
    const hints = createHints(view, START);
    hints.step(1 / 60, { x: 0, z: -3 }, true);
    hints.jumped();
    hints.fell(START);
    expect(view).toEqual({ showMoveHint: true, showJumpHint: true, fell: true });
    for (const dt of run(Math.ceil((OOPS_SECONDS + 0.1) * 60))) hints.step(dt, START, false);
    expect(view.fell).toBe(false);
  });

  it('starts over after Play again', () => {
    const view = fresh();
    const hints = createHints(view, START);
    hints.step(1 / 60, { x: 0, z: -3 }, true);
    hints.jumped();
    hints.fell(START);
    hints.reset(START);
    expect(view).toEqual({ showMoveHint: true, showJumpHint: true, fell: false });
  });
});

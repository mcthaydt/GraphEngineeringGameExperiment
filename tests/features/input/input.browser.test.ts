import { afterEach, describe, expect, it } from 'vitest';
import { createInput, type Input } from '../../../src/features/input/input';

let input: Input;
afterEach(() => input.dispose());
const key = (type: 'keydown' | 'keyup', code: string) => window.dispatchEvent(new KeyboardEvent(type, { code, cancelable: true }));

describe('input', () => {
  it('reads arrows, WASD and Space', () => {
    input = createInput();
    key('keydown', 'ArrowUp');
    expect(input.read()).toEqual({ moveX: 0, moveZ: -1, jump: false });
    key('keydown', 'KeyD');
    key('keydown', 'Space');
    const both = input.read();
    expect(Math.hypot(both.moveX, both.moveZ)).toBeCloseTo(1);
    expect(both.moveX).toBeGreaterThan(0);
    expect(both.jump).toBe(true);
    key('keyup', 'ArrowUp');
    key('keyup', 'KeyD');
    key('keyup', 'Space');
    expect(input.read()).toEqual({ moveX: 0, moveZ: 0, jump: false });
  });

  it('reads the touch stick and jump button', () => {
    input = createInput();
    input.setStick(0.5, -0.5);
    input.setTouchJump(true);
    expect(input.read()).toEqual({ moveX: 0.5, moveZ: -0.5, jump: true });
  });

  it('lets go of every key when the window loses focus', () => {
    input = createInput();
    key('keydown', 'ArrowLeft');
    window.dispatchEvent(new Event('blur'));
    expect(input.read().moveX).toBe(0);
  });
});

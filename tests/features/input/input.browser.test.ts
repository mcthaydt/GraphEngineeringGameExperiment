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

  it('hears a key let go while a button has focus', () => {
    input = createInput();
    key('keydown', 'ArrowUp');
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true, cancelable: true }));
    button.remove();
    expect(input.read().moveZ).toBe(0);
  });

  it('still lets Space press a focused button', () => {
    input = createInput();
    const button = document.createElement('button');
    document.body.appendChild(button);
    const down = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true });
    button.dispatchEvent(down);
    button.remove();
    expect(down.defaultPrevented).toBe(false);
    expect(input.read().jump).toBe(false);
  });

  describe('clear', () => {
    it('lets go of keys, the stick and the jump button', () => {
      input = createInput();
      key('keydown', 'ArrowUp');
      key('keydown', 'Space');
      input.setStick(0.4, -0.8);
      input.setTouchJump(true);
      input.clear();
      expect(input.read()).toEqual({ moveX: 0, moveZ: 0, jump: false });
    });

    it('ignores a key that is still held, repeats included, until it is let go and pressed again', () => {
      input = createInput();
      key('keydown', 'ArrowUp');
      input.clear();
      key('keydown', 'ArrowUp');
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', repeat: true, cancelable: true }));
      expect(input.read().moveZ).toBe(0);
      key('keyup', 'ArrowUp');
      key('keydown', 'ArrowUp');
      expect(input.read().moveZ).toBe(-1);
    });

    it('does not block keys that were not held', () => {
      input = createInput();
      key('keydown', 'ArrowUp');
      input.clear();
      key('keydown', 'ArrowLeft');
      expect(input.read()).toEqual({ moveX: -1, moveZ: 0, jump: false });
    });
  });
});

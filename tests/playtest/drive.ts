import type { Wish } from './autopilot';

// The device matrix: screen sizes only, which is emulation evidence and not a real device.
export const DEVICES = [
  { name: 'computer', width: 1280, height: 720, touch: false },
  { name: 'tablet', width: 810, height: 1080, touch: true },
  { name: 'small phone', width: 375, height: 667, touch: true },
] as const;

export const KEYS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', jump: 'Space' } as const;

/** Holds or lets go of each key, as real key events on the window. */
export function pressKeys(wish: Wish): void {
  for (const [name, code] of Object.entries(KEYS)) {
    window.dispatchEvent(new KeyboardEvent(wish[name as keyof Wish] ? 'keydown' : 'keyup', { code, cancelable: true }));
  }
}

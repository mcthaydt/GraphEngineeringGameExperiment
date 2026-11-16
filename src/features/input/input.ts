import type { Intent } from '../sim/sim';

const MOVES: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
};
const JUMPS = new Set(['Space', 'KeyJ', 'KeyZ']);

export interface Input {
  read(): Intent;
  /** The touch stick: x is right, z is toward the camera, length at most 1. */
  setStick(x: number, z: number): void;
  setTouchJump(held: boolean): void;
  /**
   * Lets go of everything, for a restart. A key that is still physically down stays ignored, repeats included,
   * until it comes up and goes down again, so a hero never runs off by itself.
   */
  clear(): void;
  dispose(): void;
}

/** Keyboard and touch folded into one intent. `target` is where key events are heard. */
export function createInput(target: Window | HTMLElement = window): Input {
  const held = new Set<string>();
  const stale = new Set<string>();
  const stick = { x: 0, z: 0 };
  let touchJump = false;

  const onKey = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (!(e.code in MOVES || JUMPS.has(e.code))) return;
    // Typing into a button (Space presses "Play again") must keep working, but a key let go there still counts.
    const onButton = e.target instanceof HTMLButtonElement;
    if (e.type === 'keyup') {
      held.delete(e.code);
      stale.delete(e.code);
      if (!onButton) e.preventDefault();
      return;
    }
    if (onButton || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault(); // or the arrows and Space scroll the page
    if (!stale.has(e.code)) held.add(e.code);
  };
  // A key let go while the window had no focus is never heard, so forget it for good.
  const release = (): void => {
    held.clear();
    stale.clear();
  };

  target.addEventListener('keydown', onKey);
  target.addEventListener('keyup', onKey);
  window.addEventListener('blur', release);

  return {
    read(): Intent {
      let x = stick.x;
      let z = stick.z;
      let jump = touchJump;
      for (const code of held) {
        const move = MOVES[code];
        if (move) {
          x += move[0];
          z += move[1];
        } else jump = true;
      }
      const length = Math.hypot(x, z);
      return length > 1 ? { moveX: x / length, moveZ: z / length, jump } : { moveX: x, moveZ: z, jump };
    },
    setStick(x, z) {
      stick.x = x;
      stick.z = z;
    },
    setTouchJump(isHeld) {
      touchJump = isHeld;
    },
    clear() {
      for (const code of held) stale.add(code);
      held.clear();
      stick.x = stick.z = 0;
      touchJump = false;
    },
    dispose() {
      target.removeEventListener('keydown', onKey);
      target.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', release);
    },
  };
}

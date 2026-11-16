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
  dispose(): void;
}

/** Keyboard and touch folded into one intent. `target` is where key events are heard. */
export function createInput(target: Window | HTMLElement = window): Input {
  const held = new Set<string>();
  const stick = { x: 0, z: 0 };
  let touchJump = false;

  const onKey = (event: Event): void => {
    const e = event as KeyboardEvent;
    const known = e.code in MOVES || JUMPS.has(e.code);
    // Typing into a button or field must keep working (Space presses "Play again").
    if (!known || e.target instanceof HTMLButtonElement || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault(); // or the arrows and Space scroll the page
    if (e.type === 'keydown') held.add(e.code);
    else held.delete(e.code);
  };
  const release = (): void => held.clear();

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
    dispose() {
      target.removeEventListener('keydown', onKey);
      target.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', release);
    },
  };
}

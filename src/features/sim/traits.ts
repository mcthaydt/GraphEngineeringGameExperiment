import { trait } from 'koota';

export const Position = trait({ x: 0, y: 0, z: 0 });
export const Velocity = trait({ x: 0, y: 0, z: 0 });

/** The player's body state. Timers count simulation steps. */
export const Hero = trait({
  grounded: false,
  /** Radians around +y; 0 faces +z, toward the camera. */
  facing: Math.PI,
  coyote: 0,
  jumpBuffer: 0,
  jumpHeld: false,
  /** True from take-off until the jump is cut short or the peak is passed. */
  rising: false,
  /** Resting on the lip of a platform with the middle of the body in the air: not standing, but a jump still works. */
  hooked: false,
});

export const Slab = trait({ width: 1, depth: 1, thickness: 1 });
export const Goal = trait({ reach: 1 });

/** One per world: the state of the current attempt. */
export const Run = trait({ phase: 'playing' as Phase, falls: 0, steps: 0 });

export type Phase = 'playing' | 'won';

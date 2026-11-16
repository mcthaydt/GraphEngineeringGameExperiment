import { damp } from '../../lib/maths';
import type { Tuning } from '../tuning/tuning';

export interface CameraPose {
  readonly position: { x: number; y: number; z: number };
  readonly target: { x: number; y: number; z: number };
  readonly fov: number;
}

export interface Followed {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly grounded: boolean;
}

// The camera drifts sideways less than the player, so the course stays centred and readable.
const SIDE_SHARE = 0.55;

/** A fixed-angle camera behind and above the player. It ignores the hop of a jump so the height of platforms reads. */
export function createCameraRig(tuning: Tuning['camera'], start: Followed) {
  const focus = { x: start.x * SIDE_SHARE, y: start.y, z: start.z };

  return {
    /** Jumps straight to the player, with no glide: for the start and after a fall. */
    snap(to: Followed): void {
      focus.x = to.x * SIDE_SHARE;
      focus.y = to.y;
      focus.z = to.z;
    },
    update(to: Followed, dt: number, aspect: number): CameraPose {
      focus.x = damp(focus.x, to.x * SIDE_SHARE, tuning.follow, dt);
      focus.z = damp(focus.z, to.z, tuning.follow, dt);
      // Height follows landings and falls, not the arc of a jump.
      if (to.grounded || to.y < focus.y) focus.y = damp(focus.y, to.y, tuning.follow_height, dt);
      // A tall screen sees a narrow slice, so pull back and widen to keep the next platform in view.
      const tall = Math.min(1, Math.max(0, (1.2 - aspect) / 0.7));
      const pull = 1 + tall * 0.35;
      return {
        position: { x: focus.x, y: focus.y + tuning.up * pull, z: focus.z + tuning.back * pull },
        target: { x: focus.x, y: focus.y + tuning.look_up, z: focus.z - tuning.look_ahead },
        fov: tuning.fov + tall * 14,
      };
    },
  };
}

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
  /** Speed along the course (negative is forward): the camera looks a little further ahead the faster it is. */
  readonly vz?: number;
}

// The camera drifts sideways less than the player, so the course stays centred and readable.
const SIDE_SHARE = 0.55;

/** A fixed-angle camera behind and above the player. It ignores the hop of a jump so the height of platforms reads. */
export function createCameraRig(tuning: Tuning['camera'], start: Followed) {
  const focus = { x: start.x * SIDE_SHARE, y: start.y, z: start.z };
  // Where the player last stood: a fall is followed only a little way down from here.
  let standingY = start.y;

  return {
    /** Jumps straight to the player, with no glide: for the start and after a fall. */
    snap(to: Followed): void {
      focus.x = to.x * SIDE_SHARE;
      focus.y = to.y;
      focus.z = to.z;
      standingY = to.y;
    },
    update(to: Followed, dt: number, aspect: number): CameraPose {
      focus.x = damp(focus.x, to.x * SIDE_SHARE, tuning.follow, dt);
      focus.z = damp(focus.z, to.z + (to.vz ?? 0) * tuning.lead, tuning.follow, dt);
      // Height follows landings, not the arc of a jump. A fall is followed only a little way, so the hero stays on screen.
      if (to.grounded) standingY = to.y;
      if (to.grounded || to.y < focus.y) focus.y = Math.max(standingY - tuning.fall_follow, damp(focus.y, to.y, tuning.follow_height, dt));
      // A tall screen sees a narrow slice, so pull back and widen to keep the next platform in view.
      const tall = Math.min(1, Math.max(0, (1.2 - aspect) / 0.7));
      const pull = 1 + tall * 0.15;
      return {
        position: { x: focus.x, y: focus.y + tuning.up * pull, z: focus.z + tuning.back * pull },
        target: { x: focus.x, y: focus.y + tuning.look_up, z: focus.z - tuning.look_ahead },
        fov: tuning.fov + tall * 6,
      };
    },
  };
}

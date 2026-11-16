import { type Course, platformUnder } from '../../src/features/course/course';
import type { Snapshot } from '../../src/index';

export interface Wish {
  readonly left: boolean;
  readonly right: boolean;
  readonly up: boolean;
  readonly down: boolean;
  readonly jump: boolean;
}

// How far ahead of its feet the pilot looks for ground, in metres.
const LOOK = 0.9;

/** A simple player: heads for the next platform and jumps when the ground ahead runs out. */
export function createAutopilot(course: Course) {
  let reached = 0;
  return (s: Snapshot): Wish => {
    const under = platformUnder(course, s.x, s.z);
    if (under && s.grounded) reached = Math.max(reached, course.platforms.indexOf(under));
    const next = course.platforms[reached + 1];
    const target = next ?? course.flag;
    const dx = target.x - s.x;
    const dz = target.z - s.z;
    const length = Math.hypot(dx, dz) || 1;
    const ahead = platformUnder(course, s.x + (dx / length) * LOOK, s.z + (dz / length) * LOOK);
    const edge = !ahead || ahead.y > s.y + 0.2;
    return {
      left: dx < -0.35,
      right: dx > 0.35,
      up: dz < -0.35,
      down: dz > 0.35,
      // Hold the jump all the way up for a full leap.
      jump: (s.grounded && edge) || (!s.grounded && s.vy > 0),
    };
  };
}

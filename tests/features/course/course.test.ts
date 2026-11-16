import { describe, expect, it } from 'vitest';
import { loadFirstCourse, parseCourse, platformUnder } from '../../../src/features/course/course';
import { loadTuning } from '../../../src/features/tuning/tuning';

describe('course', () => {
  const course = loadFirstCourse();

  it('starts and ends on a platform', () => {
    expect(platformUnder(course, course.start.x, course.start.z)?.y).toBe(course.start.y);
    expect(platformUnder(course, course.flag.x, course.flag.z)?.y).toBe(course.flag.y);
  });

  it('keeps every gap inside one held jump', () => {
    const { run_speed, jump_speed, gravity, fall_gravity } = loadTuning().player;
    course.platforms.slice(1).forEach((to, index) => {
      const i = index + 1;
      const from = course.platforms[index] ?? to;
      const rise = to.y - from.y;
      const peak = jump_speed ** 2 / (2 * gravity);
      expect(rise, `platform ${i} is too high`).toBeLessThan(peak * 0.75);
      const airTime = jump_speed / gravity + Math.sqrt((2 * (peak - rise)) / fall_gravity);
      const gapX = Math.max(0, Math.abs(to.x - from.x) - (to.width + from.width) / 2);
      const gapZ = Math.max(0, Math.abs(to.z - from.z) - (to.depth + from.depth) / 2);
      // Every gap leaves room for a late or early press, and the last leap, the hardest, leaves a little.
      const room = i === course.platforms.length - 1 ? 0.95 : 0.75;
      expect(Math.hypot(gapX, gapZ), `gap before platform ${i}`).toBeLessThan(run_speed * airTime * room);
    });
  });

  it('rejects a course with a missing field or a flag below the fall line', () => {
    expect(() => parseCourse('name = "x"')).toThrow();
    const bad = `name="x"\nfall_y=0\nstart={x=0,y=1,z=0}\nflag={x=0,y=-1,z=0}\n[[platforms]]\nx=0\ny=0\nz=0\nwidth=1\ndepth=1\n[[platforms]]\nx=0\ny=0\nz=0\nwidth=1\ndepth=1`;
    expect(() => parseCourse(bad)).toThrow();
  });
});

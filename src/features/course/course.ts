import { parse } from 'smol-toml';
import { z } from 'zod';
import firstCourse from './library/first-course.toml?raw';

const Point = z.strictObject({ x: z.number(), y: z.number(), z: z.number() });

/** A platform is placed by the middle of its top face, which is where the player stands. */
const Platform = z.strictObject({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  width: z.number().positive(),
  depth: z.number().positive(),
  thickness: z.number().positive().default(1.4),
});

export const CourseSchema = z
  .strictObject({
    name: z.string().min(1),
    /** Dropping below this height puts the player back at the start. */
    fall_y: z.number(),
    start: Point,
    flag: Point,
    platforms: z.array(Platform).min(2),
  })
  .refine((course) => course.start.y > course.fall_y && course.flag.y > course.fall_y, {
    message: 'start and flag must be above fall_y',
  });

export type Course = z.infer<typeof CourseSchema>;
export type Platform = z.infer<typeof Platform>;

export const parseCourse = (toml: string): Course => CourseSchema.parse(parse(toml));

export const loadFirstCourse = (): Course => parseCourse(firstCourse);

/** The platform whose top is under a point, if any: used to check a course is standable. */
export const platformUnder = (course: Course, x: number, z: number): Platform | undefined =>
  course.platforms.find((p) => Math.abs(x - p.x) <= p.width / 2 && Math.abs(z - p.z) <= p.depth / 2);

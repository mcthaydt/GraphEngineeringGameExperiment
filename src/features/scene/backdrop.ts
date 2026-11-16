import type { Container3D } from '@pixi/3d';
import type { Course } from '../course/course';
import { createBaker } from './baked';
import { bakeIsland, hazeTint } from './island';
import { HAZE, LOOKS } from './palette';

/** Small floating islands far off to the sides and beyond the flag, fading into haze with distance: scale and depth for the eye. */
const ISLANDS = [
  { x: -34, y: 1.5, beyond: 10, size: 5, haze: 0.28 },
  { x: 38, y: 4.5, beyond: 22, size: 6, haze: 0.29 },
  { x: -46, y: 7, beyond: 44, size: 7, haze: 0.35 },
  { x: 24, y: 8.5, beyond: 58, size: 5, haze: 0.39 },
  { x: -58, y: 2, beyond: -22, size: 6, haze: 0.32 },
  { x: 52, y: -1, beyond: -30, size: 7, haze: 0.32 },
  { x: -42, y: 5, beyond: -44, size: 5, haze: 0.35 },
  { x: 8, y: 9, beyond: 84, size: 9, haze: 0.46 },
  { x: -22, y: 6, beyond: 96, size: 8, haze: 0.49 },
  { x: 40, y: 10, beyond: 104, size: 10, haze: 0.50 },
  { x: -64, y: 9, beyond: 70, size: 9, haze: 0.43 },
] as const;

/** Far shapes with the light baked in, drawn last so everything nearer sits in front. */
export function createBackdrop(course: Course): Container3D {
  const baker = createBaker();
  ISLANDS.forEach((island, index) => {
    const size = island.size;
    bakeIsland(
      baker,
      { x: course.flag.x + island.x, y: island.y, z: course.flag.z - island.beyond, width: size, depth: size, thickness: size * 0.45 },
      { look: LOOKS[index % LOOKS.length] ?? LOOKS[0]!, tile: 4, tint: hazeTint(HAZE, island.haze), seed: 900 + index },
    );
  });
  return baker.build('backdrop');
}

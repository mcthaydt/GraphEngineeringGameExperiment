import { type Container3D, CubeGeometry, SphereGeometry } from '@pixi/3d';
import type { Course } from '../course/course';
import { createBaker } from './baked';
import { PALETTE } from './palette';

const GRASS_THICKNESS = 0.3;
const GRASS_OVERHANG = 0.12;

/** The floating platforms: a grass cap on a block of earth that narrows underneath. */
export function createPlatforms(course: Course): Container3D {
  const baker = createBaker();
  const cube = new CubeGeometry();
  for (const p of course.platforms) {
    const body = p.thickness - GRASS_THICKNESS;
    baker.add(cube, {
      color: (_, normal) => (normal.y > 0.5 ? PALETTE.grass : PALETTE.grassEdge),
      position: { x: p.x, y: p.y - GRASS_THICKNESS / 2, z: p.z },
      scale: { x: p.width + GRASS_OVERHANG * 2, y: GRASS_THICKNESS, z: p.depth + GRASS_OVERHANG * 2 },
    });
    baker.add(cube, {
      color: PALETTE.dirt,
      fade: 0.35,
      position: { x: p.x, y: p.y - GRASS_THICKNESS - body / 2, z: p.z },
      scale: { x: p.width, y: body, z: p.depth },
    });
    baker.add(cube, {
      color: PALETTE.dirtDark,
      fade: 0.4,
      position: { x: p.x, y: p.y - p.thickness - 0.35, z: p.z },
      scale: { x: p.width * 0.7, y: 0.7, z: p.depth * 0.7 },
    });
  }
  return baker.build('platforms');
}

/** Soft clouds beside and below the course. The sky itself is a CSS gradient behind the canvas. */
export function createClouds(course: Course): Container3D {
  const baker = createBaker();
  const puff = new SphereGeometry({ radius: 1, widthSegments: 10, heightSegments: 7 });
  const length = Math.abs(course.flag.z - course.start.z);
  // A fixed pattern, not random: the scene must look the same on every run.
  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const along = (i / 9) * (length + 40) - 4;
    const x = side * (15 + ((i * 7) % 5) * 3);
    const y = -6 + ((i * 5) % 7) * 1.1;
    const z = course.start.z - along;
    for (let j = 0; j < 3; j++) {
      const size = 1.6 + ((i + j * 3) % 4) * 0.45;
      baker.add(puff, {
        // Clouds glow white on top and turn sky-blue underneath; real shading makes them look like grey rocks.
        lit: false,
        color: (_, normal) => (normal.y > 0.25 ? PALETTE.cloud : normal.y > -0.35 ? PALETTE.cloudMid : PALETTE.cloudShade),
        position: { x: x + (j - 1) * size * 1.1, y: y + (j === 1 ? size * 0.35 : 0), z },
        scale: { x: size * 1.3, y: size * 0.8, z: size },
      });
    }
  }
  return baker.build('clouds');
}

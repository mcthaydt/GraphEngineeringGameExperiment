import { type Container3D, SphereGeometry } from '@pixi/3d';
import { type Course, platformUnder } from '../course/course';
import { createBaker } from './baked';
import { bakeIsland } from './island';
import { GOAL_LOOK, type IslandLook, LOOKS, PALETTE } from './palette';
import { layoutClouds, layoutProps, mixColor, PUFF_STRETCH_X, PUFF_STRETCH_Y } from './pattern';
import { bakeProp, createPropShapes } from './props';

/** The look for a place `t` of the way along the course: each stretch shifts a little toward the next. */
function lookAt(t: number): IslandLook {
  const scaled = Math.min(1, Math.max(0, t)) * (LOOKS.length - 1);
  const from = LOOKS[Math.min(LOOKS.length - 2, Math.floor(scaled))] ?? GOAL_LOOK;
  const to = LOOKS[Math.min(LOOKS.length - 1, Math.floor(scaled) + 1)] ?? from;
  const k = scaled - Math.floor(scaled);
  const blend = (a: number, b: number): number => mixColor(a, b, k);
  return {
    top: [blend(from.top[0], to.top[0]), blend(from.top[1], to.top[1])],
    edge: blend(from.edge, to.edge),
    earth: [blend(from.earth[0], to.earth[0]), blend(from.earth[1], to.earth[1])],
    deep: blend(from.deep, to.deep),
  };
}

/** The floating platforms and the little things growing on them, baked into one mesh. */
export function createPlatforms(course: Course): Container3D {
  const baker = createBaker();
  const goal = platformUnder(course, course.flag.x, course.flag.z);
  course.platforms.forEach((p, index) => {
    const look = p === goal ? GOAL_LOOK : lookAt(index / Math.max(1, course.platforms.length - 1));
    bakeIsland(baker, p, { look, tile: 1.2, seed: 31 + index });
  });
  const shapes = createPropShapes();
  for (const prop of layoutProps(course)) bakeProp(baker, shapes, prop);
  return baker.build('platforms');
}

/** Soft clouds: a sea far below the course so a fall means something, and a few beside it. The sky itself is a CSS gradient behind the canvas. */
export function createClouds(course: Course): Container3D {
  const baker = createBaker();
  // Far-away puffs need few facets; the ones beside the course are seen close and get more.
  const rough = new SphereGeometry({ radius: 1, widthSegments: 10, heightSegments: 5 });
  const smooth = new SphereGeometry({ radius: 1, widthSegments: 16, heightSegments: 6 });
  // Nearest first: the depth test then throws away whatever is hidden behind, instead of painting it twice.
  const eye = { x: 0, y: 6, z: course.start.z + 10 };
  const puffs = layoutClouds(course).flatMap((cloud) =>
    cloud.puffs.map((puff) => ({ cloud, puff, at: { x: cloud.x + puff.dx, y: cloud.y + puff.dy, z: cloud.z + puff.dz } })),
  );
  puffs.sort((a, b) => Math.hypot(a.at.x - eye.x, a.at.y - eye.y, a.at.z - eye.z) - Math.hypot(b.at.x - eye.x, b.at.y - eye.y, b.at.z - eye.z));
  for (const { cloud, puff, at } of puffs) {
    const shape = cloud.layer === 'floor' ? rough : smooth;
    // The sea is a little bluer than the clouds beside the course, so it reads as far below.
    const pale = cloud.layer === 'floor' ? 0.16 : 0;
    baker.add(shape, {
      // Clouds glow white on top and turn sky-blue underneath; real shading makes them look like grey rocks.
      lit: false,
      color: (_, normal) => mixColor(normal.y > 0.25 ? PALETTE.cloud : normal.y > -0.35 ? PALETTE.cloudMid : PALETTE.cloudShade, PALETTE.cloudShade, pale),
      position: at,
      scale: { x: puff.size * PUFF_STRETCH_X, y: puff.size * PUFF_STRETCH_Y, z: puff.size },
    });
  }
  return baker.build('clouds');
}

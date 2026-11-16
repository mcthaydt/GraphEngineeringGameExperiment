import { ConeGeometry, CylinderGeometry, IcosahedronGeometry, SphereGeometry } from '@pixi/3d';
import { createBaker } from './baked';
import { lighten, type Prop } from './pattern';
import { PROPS } from './palette';

type Baker = ReturnType<typeof createBaker>;

const pick = <T>(list: readonly T[], tone: number): T => list[Math.min(list.length - 1, Math.floor(tone * list.length))] as T;

/** Shared shapes: one of each, reused for every prop. */
export function createPropShapes() {
  return {
    trunk: new CylinderGeometry({ radiusTop: 0.09, radiusBottom: 0.13, height: 1, radialSegments: 7 }),
    // Few facets: the baked colours smooth the shading, and every triangle costs time on a machine with no graphics card.
    ball: new SphereGeometry({ radius: 1, widthSegments: 9, heightSegments: 6 }),
    bud: new IcosahedronGeometry({ radius: 1, detail: 0 }),
    blade: new ConeGeometry({ radius: 0.05, height: 1, radialSegments: 4 }),
    stalk: new CylinderGeometry({ radiusTop: 0.012, radiusBottom: 0.018, height: 1, radialSegments: 4 }),
    rock: new IcosahedronGeometry({ radius: 1, detail: 0 }),
  };
}

/** Bakes one prop into the scenery mesh. Props are drawn only: nothing in the physics knows they are there. */
export function bakeProp(baker: Baker, shapes: ReturnType<typeof createPropShapes>, prop: Prop): void {
  const { x, y, z, size, tone } = prop;
  if (prop.kind === 'tree') {
    const leaf = tone > 0.86 ? PROPS.leavesWarm : pick(PROPS.leaves, tone / 0.86);
    const h = 0.7 * size;
    baker.add(shapes.trunk, { color: PROPS.trunk, position: { x, y: y + h / 2, z }, scale: { x: size, y: h, z: size } });
    baker.add(shapes.ball, { color: leaf, position: { x, y: y + h + 0.38 * size, z }, scale: { x: 0.62 * size, y: 0.52 * size, z: 0.62 * size } });
    baker.add(shapes.ball, { color: lighten(leaf, 0.1), position: { x: x + 0.04, y: y + h + 0.82 * size, z }, scale: { x: 0.42 * size, y: 0.38 * size, z: 0.42 * size } });
  } else if (prop.kind === 'bush') {
    const leaf = pick(PROPS.leaves, tone);
    baker.add(shapes.ball, { color: leaf, position: { x, y: y + 0.18 * size, z }, scale: { x: 0.44 * size, y: 0.3 * size, z: 0.4 * size } });
  } else if (prop.kind === 'flower') {
    const h = 0.28 * size;
    baker.add(shapes.stalk, { color: PROPS.stalk, position: { x, y: y + h / 2, z }, scale: { x: 1, y: h, z: 1 } });
    baker.add(shapes.bud, { color: pick(PROPS.flowers, tone), position: { x, y: y + h + 0.03, z }, scale: { x: 0.1 * size, y: 0.06 * size, z: 0.1 * size } });
  } else if (prop.kind === 'tuft') {
    for (let k = 0; k < 3; k++) {
      const lean = (k - 1) * 0.5;
      baker.add(shapes.blade, {
        color: lighten(PROPS.tuft, k * 0.06),
        position: { x: x + (k - 1) * 0.07, y: y + 0.12 * size, z: z + (k % 2) * 0.05 },
        scale: { x: 1, y: (0.22 + (k % 2) * 0.08) * size, z: 1 },
        yaw: lean,
      });
    }
  } else {
    baker.add(shapes.rock, { color: lighten(PROPS.rock, tone * 0.12), position: { x, y: y + 0.12 * size, z }, scale: { x: 0.34 * size, y: 0.22 * size, z: 0.3 * size }, yaw: tone * 3 });
  }
}

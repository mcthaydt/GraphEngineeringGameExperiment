import { Container3D, CylinderGeometry, FlatMaterial, Geometry3D, Material3D, Mesh3D, SphereGeometry, srgbToLinear, TorusGeometry } from '@pixi/3d';
import { createBaker } from './baked';
import { PALETTE } from './palette';
import { clothWave } from './pattern';

export interface FlagView {
  readonly node: Container3D;
  update(seconds: number): void;
}

const PLINTH_HEIGHT = 0.56;
const POLE_HEIGHT = 4.5;
const CLOTH_LENGTH = 2.1;
const CLOTH_HEIGHT = 1.3;
const TIP_HEIGHT = 0.8;
const SEGMENTS = 6;
/** How far the cloth swings, as a multiple of the wave in `pattern.ts`. */
const SWAY = 1.5;

const CLOTH_BANDS: readonly { readonly from: number; readonly to: number; readonly color: number }[] = [
  { from: 0, to: 0.38, color: PALETTE.flag },
  { from: 0.38, to: 0.62, color: PALETTE.gold },
  { from: 0.62, to: 1, color: PALETTE.flag },
];

const linear = (hex: number): [number, number, number] => [srgbToLinear(((hex >> 16) & 255) / 255), srgbToLinear(((hex >> 8) & 255) / 255), srgbToLinear((hex & 255) / 255)];

/** A flat piece of cloth facing +z, seen from both sides, hanging down from y = 0. `fork` makes the end a swallow-tail. */
function clothPiece(length: number, heightLeft: number, heightRight: number, fork: boolean): Geometry3D {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const push = (x: number, y: number, color: number): number => {
    positions.push(x, y, 0);
    colors.push(...linear(color), 1);
    return positions.length / 3 - 1;
  };
  if (!fork) {
    for (const band of CLOTH_BANDS) {
      const a = push(0, -heightLeft * band.from, band.color);
      const b = push(0, -heightLeft * band.to, band.color);
      const c = push(length, -heightRight * band.to, band.color);
      const d = push(length, -heightRight * band.from, band.color);
      indices.push(a, b, c, a, c, d);
    }
  } else {
    // Two tails with a notch between them, in the cloth's own red.
    const notch = push(length * 0.45, -heightLeft * 0.5, PALETTE.flag);
    const topLeft = push(0, 0, PALETTE.flag);
    const topTip = push(length, 0, PALETTE.flag);
    const topNotch = push(length * 0.45, 0, PALETTE.flag);
    const bottomLeft = push(0, -heightLeft, PALETTE.flag);
    const bottomTip = push(length, -heightLeft, PALETTE.flag);
    const bottomNotch = push(length * 0.45, -heightLeft, PALETTE.flag);
    indices.push(topLeft, notch, topTip, topLeft, topNotch, notch, bottomLeft, bottomTip, notch, bottomLeft, notch, bottomNotch);
    void heightRight;
  }
  const count = positions.length / 3;
  const normals = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) normals[i * 3 + 2] = 1;
  return new Geometry3D({ positions: new Float32Array(positions), normals, colors: new Float32Array(colors), indices: new Uint32Array(indices) });
}

/** The goal: a stepped plinth, a tall pole, a waving two-tailed flag, and a faint column of light that can be spotted from far away. */
export function createFlag(at: { x: number; y: number; z: number }): FlagView {
  const node = new Container3D({ label: 'flag', position: at });
  const gold = new Material3D({ baseColor: PALETTE.gold, roughness: 0.35, emissive: { color: PALETTE.gold, strength: 0.25 } });

  // The plinth never moves, so its lighting is baked like the scenery's.
  const baker = createBaker();
  const step = new CylinderGeometry({ radiusTop: 1, radiusBottom: 1, height: 1, radialSegments: 12 });
  const steps: [number, number, number][] = [
    [1.05, 0.2, PALETTE.gold],
    [0.78, 0.2, 0xfff6dc],
    [0.52, 0.16, PALETTE.gold],
  ];
  let level = 0;
  for (const [radius, height, color] of steps) {
    baker.add(step, { color, position: { x: 0, y: level + height / 2, z: 0 }, scale: { x: radius, y: height, z: radius } });
    level += height;
  }
  const plinth = baker.build('plinth');

  const pole = new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.075, radiusBottom: 0.1, height: POLE_HEIGHT, radialSegments: 10 }),
    material: new Material3D({ baseColor: PALETTE.pole, roughness: 0.4 }),
    position: { x: 0, y: PLINTH_HEIGHT + POLE_HEIGHT / 2, z: 0 },
  });
  const topY = PLINTH_HEIGHT + POLE_HEIGHT;
  const top = new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.19, widthSegments: 12, heightSegments: 8 }),
    material: gold,
    position: { x: 0, y: topY + 0.1, z: 0 },
  });
  const ring = new Mesh3D({
    geometry: new TorusGeometry({ radius: 1.75, tube: 0.09, radialSegments: 6, tubularSegments: 36 }),
    material: gold,
    position: { x: 0, y: 0.06, z: 0 },
    castShadow: false,
  });

  // The cloth is a chain of short flat pieces, each turned a little from the last, so it ripples instead of swinging like a door.
  const clothMaterial = new Material3D({ baseColor: 0xffffff, roughness: 0.6, vertexColors: true, doubleSided: true, emissive: { color: PALETTE.flag, strength: 0.2 } });
  const hinges: Container3D[] = [];
  const length = CLOTH_LENGTH / SEGMENTS;
  const heightAt = (u: number): number => CLOTH_HEIGHT + (TIP_HEIGHT - CLOTH_HEIGHT) * u;
  let parent: Container3D = node;
  for (let k = 0; k < SEGMENTS; k++) {
    const hinge = new Container3D({ position: k === 0 ? { x: 0.08, y: topY - 0.2, z: 0 } : { x: length, y: 0, z: 0 } });
    const last = k === SEGMENTS - 1;
    hinge.addChild(new Mesh3D({ geometry: clothPiece(length, heightAt(k / SEGMENTS), heightAt((k + 1) / SEGMENTS), last), material: clothMaterial, castShadow: false }));
    parent.addChild(hinge);
    hinges.push(hinge);
    parent = hinge;
  }

  // A pale column of light above the flag: thin, see-through, and tall enough to spot from the start.
  const beam = (radius: number, alpha: number): Mesh3D =>
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: radius, radiusBottom: radius, height: 16, radialSegments: 8, openEnded: true }),
      material: new FlatMaterial({ baseColor: 0xfff1a8, alphaMode: 'blend', alpha }),
      position: { x: 0, y: topY + 8, z: 0 },
      castShadow: false,
    });
  node.addChild(plinth, pole, top, ring, beam(0.55, 0.1), beam(0.28, 0.16));

  return {
    node,
    update(seconds) {
      let before = 0;
      for (let k = 0; k < SEGMENTS; k++) {
        const slope = (clothWave((k + 1) / SEGMENTS, seconds) - clothWave(k / SEGMENTS, seconds)) * SWAY / length;
        const hinge = hinges[k];
        if (hinge) hinge.rotation.y = -(slope - before);
        before = slope;
      }
      ring.scale.set(1 + Math.sin(seconds * 3) * 0.04, 1, 1 + Math.sin(seconds * 3) * 0.04);
      top.position.y = topY + 0.1 + Math.sin(seconds * 3) * 0.03;
    },
  };
}

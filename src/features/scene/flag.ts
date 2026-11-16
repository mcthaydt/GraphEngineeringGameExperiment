import { Container3D, CubeGeometry, CylinderGeometry, Material3D, Mesh3D, SphereGeometry, TorusGeometry } from '@pixi/3d';
import { PALETTE } from './palette';

export interface FlagView {
  readonly node: Container3D;
  update(seconds: number): void;
}

const POLE_HEIGHT = 3.4;

/** The goal: a tall pole with a red flag, on a gold ring so it reads from far away. */
export function createFlag(at: { x: number; y: number; z: number }): FlagView {
  const node = new Container3D({ label: 'flag', position: at });
  const gold = new Material3D({ baseColor: PALETTE.gold, roughness: 0.35, emissive: { color: PALETTE.gold, strength: 0.25 } });
  const pole = new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.07, radiusBottom: 0.09, height: POLE_HEIGHT, radialSegments: 12 }),
    material: new Material3D({ baseColor: PALETTE.pole, roughness: 0.4 }),
    position: { x: 0, y: POLE_HEIGHT / 2, z: 0 },
  });
  const top = new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.17, widthSegments: 16, heightSegments: 10 }),
    material: gold,
    position: { x: 0, y: POLE_HEIGHT + 0.1, z: 0 },
  });
  const ring = new Mesh3D({
    geometry: new TorusGeometry({ radius: 1.1, tube: 0.09, radialSegments: 8, tubularSegments: 32 }),
    material: gold,
    position: { x: 0, y: 0.06, z: 0 },
    castShadow: false,
  });
  // The cloth hangs from a hinge at the pole, so turning the hinge makes it wave.
  const hinge = new Container3D({ position: { x: 0.07, y: POLE_HEIGHT - 0.55, z: 0 } });
  const cloth = new Mesh3D({
    geometry: new CubeGeometry({ width: 1.3, height: 0.85, depth: 0.04 }),
    material: new Material3D({ baseColor: PALETTE.flag, roughness: 0.6, emissive: { color: PALETTE.flag, strength: 0.2 } }),
    position: { x: 0.65, y: 0, z: 0 },
  });
  hinge.addChild(cloth);
  node.addChild(pole, top, ring, hinge);

  return {
    node,
    update(seconds) {
      hinge.rotation.y = Math.sin(seconds * 2.4) * 0.28;
      ring.scale.set(1 + Math.sin(seconds * 3) * 0.05, 1, 1 + Math.sin(seconds * 3) * 0.05);
      top.position.y = POLE_HEIGHT + 0.1 + Math.sin(seconds * 3) * 0.03;
    },
  };
}

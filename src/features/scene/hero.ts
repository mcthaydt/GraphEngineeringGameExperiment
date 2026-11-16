import { CapsuleGeometry, Container3D, CylinderGeometry, Material3D, Mesh3D, SphereGeometry } from '@pixi/3d';
import { clamp, damp, dampAngle } from '../../lib/maths';
import { PALETTE } from './palette';

export interface HeroPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly grounded: boolean;
  readonly facing: number;
}

export interface HeroView {
  readonly node: Container3D;
  update(pose: HeroPose, dt: number): void;
  /** A quick squash, scaled by how hard the landing was (m/s). */
  land(speed: number): void;
  /** A quick stretch at take-off. */
  jump(): void;
  cheer(on: boolean): void;
}

/** Pip: a round orange fellow built from simple shapes. The origin is at the feet. */
export function createHero(): HeroView {
  const node = new Container3D({ label: 'hero' });
  // Squash and lean happen on an inner node so they never disturb where the hero stands or faces.
  const body = new Container3D();
  node.addChild(body);

  const skin = new Material3D({ baseColor: PALETTE.hero, roughness: 0.55 });
  const dark = new Material3D({ baseColor: PALETTE.heroDark, roughness: 0.8 });
  const sphere = new SphereGeometry({ radius: 1, widthSegments: 20, heightSegments: 14 });
  const part = (material: Material3D, x: number, y: number, z: number, sx: number, sy = sx, sz = sx): Mesh3D =>
    new Mesh3D({ geometry: sphere, material, position: { x, y, z }, scale: { x: sx, y: sy, z: sz } });

  const torso = new Mesh3D({
    geometry: new CapsuleGeometry({ radius: 0.4, height: 0.95, radialSegments: 20, heightSegments: 6 }),
    material: skin,
    position: { x: 0, y: 0.6, z: 0 },
  });
  const belly = part(new Material3D({ baseColor: PALETTE.heroBelly, roughness: 0.7 }), 0, 0.5, 0.2, 0.27, 0.3, 0.24);
  const white = new Material3D({ baseColor: PALETTE.eye, roughness: 0.3 });
  const black = new Material3D({ baseColor: PALETTE.pupil, roughness: 0.3 });
  const eyes = [-1, 1].flatMap((side) => [
    part(white, side * 0.16, 0.82, 0.3, 0.12, 0.15, 0.1),
    part(black, side * 0.17, 0.82, 0.385, 0.055, 0.075, 0.04),
  ]);
  const stalk = new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.025, radiusBottom: 0.035, height: 0.3, radialSegments: 8 }),
    material: dark,
    position: { x: 0, y: 1.2, z: 0 },
  });
  const bobble = part(new Material3D({ baseColor: PALETTE.gold, roughness: 0.4 }), 0, 1.4, 0, 0.1);
  const feet = [-1, 1].map((side) => part(dark, side * 0.2, 0.1, 0.05, 0.16, 0.1, 0.22));
  const hands = [-1, 1].map((side) => part(skin, side * 0.46, 0.52, 0, 0.11));
  body.addChild(torso, belly, ...eyes, stalk, bobble, ...hands);
  node.addChild(...feet);

  let stride = 0;
  let squash = 0; // above 0 is squashed flat, below 0 is stretched tall
  let squashSpeed = 0;
  let cheering = false;
  let clock = 0;
  let turn = Math.PI;

  return {
    node,
    update(pose, dt) {
      clock += dt;
      const speed = Math.hypot(pose.vx, pose.vz);
      turn = dampAngle(turn, cheering ? 0 : pose.facing, 16, dt);
      node.position.set(pose.x, pose.y, pose.z);
      node.rotation.y = turn;

      // A damped spring: landings and take-offs wobble once and settle.
      squashSpeed += (-squash * 260 - squashSpeed * 16) * dt;
      squash += squashSpeed * dt;
      const air = pose.grounded ? 0 : clamp(pose.vy * 0.018, -0.2, 0.22);
      const tall = 1 - squash + air;
      const wide = 1 / Math.sqrt(Math.max(0.4, tall));
      body.scale.set(wide, tall, wide);

      const running = pose.grounded && speed > 0.5;
      stride += speed * dt * 1.9;
      const swing = running ? Math.sin(stride * Math.PI) : 0;
      const bob = running ? Math.abs(Math.cos(stride * Math.PI)) * 0.06 : 0;
      const hop = cheering ? Math.abs(Math.sin(clock * 7)) * 0.35 : 0;
      body.position.y = bob + hop;
      body.rotation.x = damp(body.rotation.x, clamp(speed * 0.035, 0, 0.3) + (pose.grounded ? 0 : -pose.vy * 0.012), 12, dt);

      feet.forEach((foot, i) => {
        const side = i === 0 ? -1 : 1;
        const phase = swing * side;
        // In the air the feet tuck up; on the ground they step.
        foot.position.set(side * 0.2, pose.grounded ? 0.1 + Math.max(0, phase) * 0.14 + hop : 0.2, pose.grounded ? phase * 0.26 : -0.1 * side);
      });
      hands.forEach((hand, i) => {
        const side = i === 0 ? -1 : 1;
        const raised = cheering || !pose.grounded;
        hand.position.set(side * (raised ? 0.5 : 0.46), raised ? 0.9 : 0.52, running ? -swing * side * 0.2 : 0);
      });
    },
    land(speed) {
      squashSpeed += clamp(speed * 0.35, 1.5, 6);
    },
    jump() {
      squashSpeed -= 4;
    },
    cheer(on) {
      cheering = on;
    },
  };
}

import { Container3D, FlatMaterial, Material3D, Mesh3D, SphereGeometry } from '@pixi/3d';
import { clamp, damp, dampAngle } from '../../lib/maths';
import { blink, cheerPose, easeOutBack, HOP_EVERY, spring, stepSpring, stepTumble } from './motion';
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
  /** The ground straight below, or null over nothing at all. */
  readonly groundY?: number | null;
}

export interface HeroView {
  readonly node: Container3D;
  update(pose: HeroPose, dt: number): void;
  /** A quick squash, scaled by how hard the landing was (m/s). */
  land(speed: number): void;
  /** A quick stretch at take-off. */
  jump(): void;
  cheer(on: boolean): void;
  /** Pops back into the world after a fall. */
  arrive(): void;
  /** How high the hero is off its feet from cheering, so the shadow can follow. */
  lift(): number;
  /** How many victory hops have started, so the scene can add a sparkle to each. */
  hops(): number;
}

/** The whole hero is drawn a bit bigger than the body that collides, so it has presence on screen. */
const SCALE = 1.2;
const OUTLINE = 0.04;
const ARRIVE_SECONDS = 0.45;

/**
 * Pip: a round orange fellow in a violet cap and backpack, built from simple shapes. The origin is at the feet and
 * the front faces +z. The game mostly shows its back, so the back is the designed side: a cap with a pom, a
 * striped backpack and a wagging tail, in a second colour that no grass, earth or sky is near.
 */
export function createHero(): HeroView {
  const node = new Container3D({ label: 'hero' });
  // Squash happens on `body`, turning over in a fall on `spin`: neither disturbs where the hero stands or faces.
  const spin = new Container3D({ position: { x: 0, y: 0.6, z: 0 } });
  const body = new Container3D({ position: { x: 0, y: -0.6, z: 0 } });
  spin.addChild(body);
  node.addChild(spin);

  const lit = (color: number, roughness = 0.55): Material3D => new Material3D({ baseColor: color, roughness });
  const skin = lit(PALETTE.hero);
  const violet = lit(PALETTE.heroViolet, 0.5);
  const boot = lit(PALETTE.heroBoot, 0.6);
  const cream = lit(PALETTE.cream, 0.6);
  const white = lit(PALETTE.eye, 0.25);
  const black = lit(PALETTE.pupil, 0.25);
  const outline = new FlatMaterial({ baseColor: PALETTE.heroOutline });
  // Only the far side of a slightly bigger copy shows, which draws a dark line round the silhouette.
  outline.state.cullMode = 'front';

  const sphere = new SphereGeometry({ radius: 1, widthSegments: 20, heightSegments: 14 });
  const part = (
    parent: Container3D,
    material: Material3D,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy = sx,
    sz = sx,
    line = false,
  ): Mesh3D => {
    const mesh = new Mesh3D({ geometry: sphere, material, position: { x, y, z }, scale: { x: sx, y: sy, z: sz } });
    if (line) {
      parent.addChild(
        new Mesh3D({
          geometry: sphere,
          material: outline,
          position: { x, y, z },
          scale: { x: sx + OUTLINE, y: sy + OUTLINE, z: sz + OUTLINE },
          castShadow: false,
          receiveShadow: false,
        }),
      );
    }
    parent.addChild(mesh);
    return mesh;
  };

  // The body and its face.
  part(body, skin, 0, 0.62, 0, 0.46, 0.5, 0.44, true);
  part(body, cream, 0, 0.44, 0.27, 0.3, 0.28, 0.17);
  const eyes = [-1, 1].map((side) => {
    const eye = new Container3D({ position: { x: side * 0.15, y: 0.73, z: 0 } });
    part(eye, white, 0, 0, 0.34, 0.125, 0.155, 0.1);
    part(eye, black, side * 0.01, 0, 0.405, 0.065, 0.09, 0.05);
    part(eye, white, side * 0.01 - 0.02, 0.045, 0.44, 0.025);
    body.addChild(eye);
    return eye;
  });
  for (const side of [-1, 1]) part(body, lit(PALETTE.blush, 0.8), side * 0.28, 0.58, 0.34, 0.07, 0.045, 0.03);
  const mouth = part(body, black, 0, 0.56, 0.425, 0.06, 0.03, 0.03);

  // The cap, its brim and pom: violet and cream on top of orange, so the head reads from every side.
  const cap = new Container3D();
  part(cap, violet, 0, 1.0, 0, 0.42, 0.27, 0.41, true);
  part(cap, cream, 0, 0.93, 0, 0.44, 0.06, 0.43);
  part(cap, violet, 0, 0.925, 0.36, 0.23, 0.04, 0.17);
  const pom = new Container3D({ position: { x: 0, y: 1.28, z: 0 } });
  part(pom, cream, 0, 0, 0, 0.11, 0.11, 0.11, true);
  cap.addChild(pom);
  body.addChild(cap);

  // The pack and tail: what the player sees most.
  const pack = new Container3D();
  part(pack, violet, 0, 0.52, -0.42, 0.26, 0.28, 0.18, true);
  part(pack, cream, 0, 0.58, -0.42, 0.27, 0.05, 0.19);
  body.addChild(pack);
  const tail = new Container3D({ position: { x: 0, y: 0.3, z: -0.4 } });
  part(tail, cream, 0, 0, -0.1, 0.12, 0.12, 0.12, true);
  body.addChild(tail);

  // Arms hang from the shoulders, so the hands always stay joined to the body.
  const arms = [-1, 1].map((side) => {
    const arm = new Container3D({ position: { x: side * 0.4, y: 0.74, z: 0 } });
    part(arm, skin, side * 0.05, -0.11, 0, 0.1, 0.16, 0.1, true);
    part(arm, cream, side * 0.09, -0.24, 0, 0.14, 0.14, 0.14, true);
    body.addChild(arm);
    return arm;
  });

  const feet = [-1, 1].map((side) => {
    const foot = new Container3D({ position: { x: side * 0.2, y: 0.12, z: 0.04 } });
    part(foot, boot, 0, 0, 0.02, 0.17, 0.12, 0.24, true);
    node.addChild(foot);
    return foot;
  });

  let stride = 0;
  const squash = spring(0); // above 0 is squashed flat, below 0 is stretched tall
  const pomSway = { x: spring(0), z: spring(0) };
  const tumble = { falling: 0, angle: 0 };
  let cheering = false;
  let cheerClock = 0;
  let clock = 0;
  let turn = Math.PI;
  let arriving = ARRIVE_SECONDS;
  let lifted = 0;
  let hopsStarted = 0;

  return {
    node,
    update(pose, dt) {
      clock += dt;
      const speed = Math.hypot(pose.vx, pose.vz);
      const dance = cheering ? cheerPose((cheerClock += dt)) : { hop: 0, spin: 0 };
      turn = dampAngle(turn, cheering ? 0 : pose.facing, 16, dt);
      lifted = dance.hop;
      if (cheering) hopsStarted = Math.floor(cheerClock / HOP_EVERY) + 1;
      arriving = Math.min(ARRIVE_SECONDS, arriving + dt);
      node.position.set(pose.x, pose.y + dance.hop, pose.z);
      node.rotation.y = turn + (cheering ? dance.spin : 0);

      // A fall that lasts turns the hero over and shrinks it away; a short drop over a gap does not.
      const falling = !pose.grounded && pose.groundY === null && pose.vy < -9;
      stepTumble(tumble, falling, dt);
      const fade = falling ? 1 - clamp((tumble.falling - 0.1) * 0.7, 0, 0.5) : 1;
      const size = SCALE * easeOutBack(arriving / ARRIVE_SECONDS) * fade;
      node.scale.set(size, size, size);
      spin.rotation.set(tumble.angle * 0.35, 0, tumble.angle);

      // A damped spring: landings and take-offs wobble once and settle.
      stepSpring(squash, 0, 260, 16, dt);
      const air = pose.grounded ? 0 : clamp(pose.vy * 0.018, -0.2, 0.22);
      const tall = 1 - squash.value + air;
      const wide = 1 / Math.sqrt(Math.max(0.4, tall));
      body.scale.set(wide, tall, wide);

      const running = pose.grounded && speed > 0.5;
      stride += speed * dt * 1.9;
      const swing = running ? Math.sin(stride * Math.PI) : 0;
      const bob = running ? Math.abs(Math.cos(stride * Math.PI)) * 0.06 : 0;
      body.position.y = -0.6 + bob;
      body.rotation.x = damp(body.rotation.x, clamp(speed * 0.035, 0, 0.3) + (pose.grounded ? 0 : -pose.vy * 0.012), 12, dt);

      // The pom and the backpack lag behind a move, then swing back.
      stepSpring(pomSway.x, clamp(-pose.vx * 0.025, -0.2, 0.2), 140, 7, dt);
      stepSpring(pomSway.z, clamp(-pose.vy * 0.012 - speed * 0.01, -0.2, 0.2), 140, 7, dt);
      pom.position.set(pomSway.x.value, 1.28 + Math.min(0, pomSway.z.value) * 0.3, pomSway.z.value);
      tail.rotation.y = Math.sin(clock * (running ? 14 : 5)) * (running ? 0.7 : 0.35);
      tail.position.y = 0.3 + (running ? Math.abs(Math.cos(stride * Math.PI)) * 0.03 : 0);

      const shut = blink(clock);
      for (const eye of eyes) eye.scale.set(1, 1 - shut * 0.9, 1);
      const open = cheering || !pose.grounded ? 1 : 0;
      mouth.scale.set(0.06 + open * 0.025, 0.03 + open * 0.06, 0.03);

      feet.forEach((foot, i) => {
        const side = i === 0 ? -1 : 1;
        const phase = swing * side;
        // In the air the feet tuck up; on the ground they step.
        foot.position.set(side * 0.2, pose.grounded ? 0.12 + Math.max(0, phase) * 0.14 : 0.26, pose.grounded ? 0.04 + phase * 0.26 : 0.04 - 0.1 * side);
      });
      arms.forEach((arm, i) => {
        const side = i === 0 ? -1 : 1;
        // Arms swing with the stride; they go up when the hero jumps, falls or cheers.
        const flail = falling ? Math.sin(clock * 24 + i * 2) * 0.5 : 0;
        const up = cheering || !pose.grounded ? 2.5 + flail : 0.12;
        arm.rotation.z = -side * up;
        arm.rotation.x = running ? -swing * side * 0.9 : 0;
      });
    },
    land(speed) {
      squash.velocity += clamp(speed * 0.35, 1.5, 6);
    },
    jump() {
      squash.velocity -= 4;
    },
    cheer(on) {
      if (on && !cheering) cheerClock = 0;
      cheering = on;
      if (!on) hopsStarted = 0;
    },
    arrive() {
      arriving = 0;
      tumble.falling = 0;
      tumble.angle = 0;
      squash.value = 0;
      squash.velocity = 0;
    },
    lift: () => lifted,
    hops: () => hopsStarted,
  };
}

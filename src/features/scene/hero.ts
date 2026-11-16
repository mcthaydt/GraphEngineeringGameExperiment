import { Container3D, FlatMaterial, Geometry3D, Mesh3D } from '@pixi/3d';
import { clamp, damp, dampAngle } from '../../lib/maths';
import { bakeShapes, type Shape } from './figure';
import { blink, brake, breath, cheerPose, easeOutBack, HOP_EVERY, runPose, spring, stepBrake, stepSpring, stepTumble, strideRate } from './motion';
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
  /** How many hard stops or turn-arounds have started, so the scene can add dust to each. */
  skids(): number;
}

/** The whole hero is drawn a bit bigger than the body that collides, so it has presence on screen. */
const SCALE = 1.2;
const OUTLINE = 0.04;
const ARRIVE_SECONDS = 0.45;

/**
 * Pip: a round orange fellow in a violet cap and backpack, built from simple shapes. The origin is at the feet and
 * the front faces +z. The game mostly shows its back, so the back is the designed side: a cap with a pom, a
 * striped backpack and a wagging tail, in a second colour that no grass, earth or sky is near.
 *
 * Each part that moves on its own is one mesh with its shapes, light and outline baked in (see `figure.ts`): nine
 * draw calls for the whole hero, because separate lit shapes were what made the game slow.
 */
export function createHero(): HeroView {
  const node = new Container3D({ label: 'hero' });
  // Squash happens on `body`, turning over in a fall on `spin`: neither disturbs where the hero stands or faces.
  const spin = new Container3D({ position: { x: 0, y: 0.6, z: 0 } });
  const body = new Container3D({ position: { x: 0, y: -0.6, z: 0 } });
  spin.addChild(body);
  node.addChild(spin);

  const material = new FlatMaterial({ baseColor: 0xffffff, vertexColors: true });
  const mesh = (parent: Container3D, shapes: readonly Shape[], at = { x: 0, y: 0, z: 0 }): Mesh3D => {
    const baked = bakeShapes(shapes, PALETTE.heroOutline, OUTLINE);
    const made = new Mesh3D({
      geometry: new Geometry3D({ positions: baked.positions, colors: baked.colors, indices: baked.indices }),
      material,
      position: at,
      castShadow: false,
      receiveShadow: false,
    });
    parent.addChild(made);
    return made;
  };
  const ball = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, rest: Partial<Shape> = {}): Shape => ({
    x,
    y,
    z,
    sx,
    sy,
    sz,
    color,
    ...rest,
  });

  // The body, its belly and cheeks, the cap with its brim, and the pack: all still, so one mesh. The cap is violet
  // and cream on top of orange so the head reads from every side; the pack is what the player sees most.
  mesh(body, [
    ball(0, 0.62, 0, 0.46, 0.5, 0.44, PALETTE.hero, { line: true }),
    ball(0, 0.44, 0.27, 0.3, 0.28, 0.17, PALETTE.cream),
    ball(-0.28, 0.58, 0.34, 0.07, 0.045, 0.03, PALETTE.blush),
    ball(0.28, 0.58, 0.34, 0.07, 0.045, 0.03, PALETTE.blush),
    ball(0, 1.0, 0, 0.42, 0.27, 0.41, PALETTE.heroViolet, { line: true }),
    ball(0, 0.93, 0, 0.44, 0.06, 0.43, PALETTE.cream),
    ball(0, 0.925, 0.36, 0.23, 0.04, 0.17, PALETTE.heroViolet),
    ball(0, 0.52, -0.42, 0.26, 0.28, 0.18, PALETTE.heroViolet, { line: true }),
    ball(0, 0.58, -0.42, 0.27, 0.05, 0.19, PALETTE.cream),
  ]);

  // Both eyes blink together, so they share a mesh that squashes about the eye line.
  const eyes = new Container3D({ position: { x: 0, y: 0.73, z: 0 } });
  mesh(
    eyes,
    [-1, 1].flatMap((side) => [
      ball(side * 0.15, 0, 0.34, 0.125, 0.155, 0.1, PALETTE.eye),
      ball(side * 0.15 + side * 0.01, 0, 0.405, 0.065, 0.09, 0.05, PALETTE.pupil, { lit: false }),
      ball(side * 0.15 + side * 0.01 - 0.02, 0.045, 0.44, 0.025, 0.025, 0.025, PALETTE.eye, { lit: false }),
    ]),
  );
  body.addChild(eyes);
  const mouth = mesh(body, [ball(0, 0, 0, 1, 1, 1, PALETTE.pupil, { lit: false })], { x: 0, y: 0.56, z: 0.425 });

  const pom = new Container3D({ position: { x: 0, y: 1.28, z: 0 } });
  mesh(pom, [ball(0, 0, 0, 0.11, 0.11, 0.11, PALETTE.cream, { line: true })]);
  body.addChild(pom);
  const tail = new Container3D({ position: { x: 0, y: 0.3, z: -0.4 } });
  mesh(tail, [ball(0, 0, -0.1, 0.12, 0.12, 0.12, PALETTE.cream, { line: true })]);
  body.addChild(tail);

  // Arms hang from the shoulders, so the hands always stay joined to the body.
  const arms = [-1, 1].map((side) => {
    const arm = new Container3D({ position: { x: side * 0.4, y: 0.74, z: 0 } });
    mesh(arm, [
      ball(side * 0.05, -0.11, 0, 0.1, 0.16, 0.1, PALETTE.hero, { line: true }),
      ball(side * 0.09, -0.24, 0, 0.14, 0.14, 0.14, PALETTE.cream, { line: true }),
    ]);
    body.addChild(arm);
    return arm;
  });

  const feet = [-1, 1].map((side) => {
    const foot = new Container3D({ position: { x: side * 0.2, y: 0.12, z: 0.04 } });
    mesh(foot, [ball(0, 0, 0.02, 0.17, 0.12, 0.24, PALETTE.heroBoot, { line: true })]);
    node.addChild(foot);
    return foot;
  });

  let cycles = 0;
  let runAmount = 0;
  let idleAmount = 0;
  const squash = spring(0); // above 0 is squashed flat, below 0 is stretched tall
  const pomSway = { x: spring(0), z: spring(0) };
  const tumble = { falling: 0, angle: 0 };
  const skid = brake();
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

      // The run eases in and out, so the sway and roll do not snap on at the first step.
      const running = pose.grounded && speed > 0.5;
      runAmount = damp(runAmount, running ? 1 : 0, 14, dt);
      idleAmount = damp(idleAmount, pose.grounded && !running && !cheering ? 1 : 0, 6, dt);
      if (running) cycles += strideRate(speed) * dt;
      const run = runPose(cycles, speed);
      stepBrake(skid, speed, pose.grounded, dt);

      // A damped spring: landings and take-offs wobble once and settle.
      stepSpring(squash, 0, 260, 16, dt);
      const air = pose.grounded ? 0 : clamp(pose.vy * 0.018, -0.2, 0.22);
      const tall = 1 - squash.value + air + breath(clock) * idleAmount;
      const wide = 1 / Math.sqrt(Math.max(0.4, tall));
      body.scale.set(wide, tall, wide);

      body.position.set(run.sway * runAmount, -0.6 + run.bob * runAmount, 0);
      body.rotation.y = run.yaw * runAmount;
      body.rotation.z = run.roll * runAmount;
      const lean = clamp(speed * 0.035, 0, 0.3) + (pose.grounded ? 0 : -pose.vy * 0.012) - skid.tilt * 0.55;
      body.rotation.x = damp(body.rotation.x, lean, 12, dt);

      // The pom and the backpack lag behind a move, then swing back.
      stepSpring(pomSway.x, clamp(-pose.vx * 0.025, -0.2, 0.2), 140, 7, dt);
      stepSpring(pomSway.z, clamp(-pose.vy * 0.012 - speed * 0.01, -0.2, 0.2), 140, 7, dt);
      pom.position.set(pomSway.x.value, 1.28 + Math.min(0, pomSway.z.value) * 0.3, pomSway.z.value);
      tail.rotation.y = Math.sin(clock * (running ? 9 : 5)) * (running ? 0.7 : 0.35);
      tail.position.y = 0.3 + (running ? Math.abs(run.step) * 0.03 : 0);

      const shut = blink(clock);
      eyes.scale.set(1, 1 - shut * 0.9, 1);
      const open = cheering || !pose.grounded ? 1 : 0;
      mouth.scale.set(0.06 + open * 0.025, 0.03 + open * 0.06, 0.03);

      feet.forEach((foot, i) => {
        const side = i === 0 ? -1 : 1;
        // In the air the feet tuck up; on the ground they step, one rising while the other plants.
        const lift = Math.max(0, side * run.rise) * run.footLift * runAmount;
        foot.position.set(
          side * 0.2 + run.sway * runAmount * 0.5,
          pose.grounded ? 0.12 + lift : 0.26,
          pose.grounded ? 0.04 + side * run.step * run.footReach * runAmount : 0.04 - 0.1 * side,
        );
      });
      arms.forEach((arm, i) => {
        const side = i === 0 ? -1 : 1;
        // Arms swing with the stride, forward and back and out to the sides; they go up when the hero jumps, falls or cheers.
        const flail = falling ? Math.sin(clock * 24 + i * 2) * 0.5 : 0;
        const up = cheering || !pose.grounded ? 2.5 + flail : Math.max(0.05, 0.2 + side * run.armSide * runAmount);
        arm.rotation.z = -side * up;
        arm.rotation.x = -side * run.armSwing * runAmount;
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
      skid.speed = 0;
      skid.tilt = 0;
      skid.hold = 0;
    },
    lift: () => lifted,
    hops: () => hopsStarted,
    skids: () => skid.count,
  };
}

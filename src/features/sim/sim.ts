import RAPIER from '@dimforge/rapier3d-deterministic';
import { createWorld } from 'koota';
import { approach } from '../../lib/maths';
import { must } from '../../lib/must';
import { msToSteps, STEP_SECONDS } from '../../lib/steps';
import type { Course } from '../course/course';
import type { Tuning } from '../tuning/tuning';
import { Goal, Hero, type Phase, Position, Run, Slab, Velocity } from './traits';

/** What the player is asking for this step. Move is on the ground plane, length at most 1. */
export interface Intent {
  readonly moveX: number;
  readonly moveZ: number;
  readonly jump: boolean;
}

export const IDLE: Intent = { moveX: 0, moveZ: 0, jump: false };

export type SimEvent =
  | { readonly type: 'jump' }
  | { readonly type: 'land'; readonly speed: number }
  | { readonly type: 'fall' }
  | { readonly type: 'win' };

export interface Snapshot {
  readonly phase: Phase;
  readonly falls: number;
  readonly steps: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly grounded: boolean;
  readonly facing: number;
  /** Height of the ground straight below the player, or null over a drop. */
  readonly groundY: number | null;
}

export interface Sim {
  /** Advances one fixed step and returns what happened in it. */
  step(intent: Intent): SimEvent[];
  snapshot(): Snapshot;
  restart(): void;
  dispose(): void;
}

// Keeps the capsule a hair off surfaces so it never tunnels or snags.
const SKIN = 0.02;
const SHADOW_REACH = 40;

export function createSim(course: Course, tuning: Tuning): Sim {
  const { player: t } = tuning;
  const world = createWorld();
  const physics = new RAPIER.World({ x: 0, y: 0, z: 0 });
  physics.timestep = STEP_SECONDS;

  for (const p of course.platforms) {
    world.spawn(Position({ x: p.x, y: p.y, z: p.z }), Slab({ width: p.width, depth: p.depth, thickness: p.thickness }));
    physics.createCollider(
      RAPIER.ColliderDesc.cuboid(p.width / 2, p.thickness / 2, p.depth / 2).setTranslation(p.x, p.y - p.thickness / 2, p.z),
    );
  }
  world.spawn(Position({ ...course.flag }), Goal({ reach: tuning.goal.reach }));
  world.add(Run);

  // Positions are the capsule's feet, so a platform's top y is where the player stands.
  const halfHeight = t.height / 2;
  const startAt = () => ({ x: course.start.x, y: course.start.y + SKIN, z: course.start.z });
  const hero = world.spawn(Position(startAt()), Velocity, Hero);
  const body = physics.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(course.start.x, course.start.y + SKIN + halfHeight, course.start.z),
  );
  const collider = physics.createCollider(RAPIER.ColliderDesc.capsule(halfHeight - t.radius, t.radius), body);
  const controller = physics.createCharacterController(SKIN);
  controller.setSlideEnabled(true);
  physics.step();

  const coyoteSteps = msToSteps(t.coyote_ms);
  const bufferSteps = msToSteps(t.jump_buffer_ms);
  const down = { x: 0, y: -1, z: 0 };

  function place(x: number, y: number, z: number): void {
    hero.set(Position, { x, y, z });
    body.setTranslation({ x, y: y + halfHeight, z }, true);
    body.setNextKinematicTranslation({ x, y: y + halfHeight, z });
  }

  function toStart(): void {
    const s = startAt();
    place(s.x, s.y, s.z);
    hero.set(Velocity, { x: 0, y: 0, z: 0 });
    hero.set(Hero, { grounded: false, facing: Math.PI, coyote: 0, jumpBuffer: 0, jumpHeld: false, rising: false });
    physics.step();
  }

  function step(intent: Intent): SimEvent[] {
    const events: SimEvent[] = [];
    const run = must(world.get(Run));
    const playing = run.phase === 'playing';
    const want = playing ? intent : IDLE;
    const pos = { ...must(hero.get(Position)) };
    const vel = { ...must(hero.get(Velocity)) };
    const h = { ...must(hero.get(Hero)) };

    const length = Math.hypot(want.moveX, want.moveZ);
    const scale = length > 1 ? 1 / length : 1;
    const targetX = want.moveX * scale * t.run_speed;
    const targetZ = want.moveZ * scale * t.run_speed;
    const accel = !h.grounded ? t.air_accel : length > 0.01 ? t.ground_accel : t.ground_brake;
    vel.x = approach(vel.x, targetX, accel * STEP_SECONDS);
    vel.z = approach(vel.z, targetZ, accel * STEP_SECONDS);
    if (length > 0.01) h.facing = Math.atan2(want.moveX, want.moveZ);

    h.jumpBuffer = want.jump && !h.jumpHeld ? bufferSteps : Math.max(0, h.jumpBuffer - 1);
    h.jumpHeld = want.jump;
    if (h.jumpBuffer > 0 && (h.grounded || h.coyote > 0)) {
      vel.y = t.jump_speed;
      h.grounded = false;
      h.coyote = 0;
      h.jumpBuffer = 0;
      h.rising = true;
      events.push({ type: 'jump' });
    }
    if (h.rising && !want.jump && vel.y > 0) {
      vel.y *= t.jump_cut;
      h.rising = false;
    }
    if (vel.y <= 0) h.rising = false;

    // Falling pulls harder than rising, so jumps feel snappy instead of floaty.
    vel.y -= (vel.y > 0 ? t.gravity : t.fall_gravity) * STEP_SECONDS;
    vel.y = Math.max(vel.y, -t.max_fall_speed);

    const wanted = { x: vel.x * STEP_SECONDS, y: vel.y * STEP_SECONDS, z: vel.z * STEP_SECONDS };
    controller.computeColliderMovement(collider, wanted);
    const moved = controller.computedMovement();
    const wasGrounded = h.grounded;
    const impact = -vel.y;
    h.grounded = controller.computedGrounded() && vel.y <= 0;

    // A blocked axis loses its speed, so the player does not stick to or grind along what it hit.
    if (Math.abs(moved.x - wanted.x) > 1e-5) vel.x = moved.x / STEP_SECONDS;
    if (Math.abs(moved.z - wanted.z) > 1e-5) vel.z = moved.z / STEP_SECONDS;
    if (vel.y > 0 && moved.y < wanted.y - 1e-5) vel.y = 0;
    if (h.grounded) {
      vel.y = 0;
      if (!wasGrounded) events.push({ type: 'land', speed: impact });
      h.coyote = coyoteSteps;
    } else {
      h.coyote = Math.max(0, h.coyote - 1);
    }

    pos.x += moved.x;
    pos.y += moved.y;
    pos.z += moved.z;
    hero.set(Velocity, vel);
    hero.set(Hero, h);
    place(pos.x, pos.y, pos.z);
    physics.step();

    if (pos.y < course.fall_y) {
      events.push({ type: 'fall' });
      toStart();
      if (playing) world.set(Run, { ...run, falls: run.falls + 1, steps: run.steps + 1 });
      return events;
    }

    let phase = run.phase;
    if (playing) {
      world.query(Position, Goal).readEach(([flag, goal]) => {
        const near = Math.hypot(pos.x - flag.x, pos.z - flag.z) <= goal.reach && Math.abs(pos.y - flag.y) <= goal.reach * 2;
        if (near && phase === 'playing') {
          phase = 'won';
          events.push({ type: 'win' });
        }
      });
    }
    world.set(Run, { phase, falls: run.falls, steps: run.steps + 1 });
    return events;
  }

  function snapshot(): Snapshot {
    const run = must(world.get(Run));
    const pos = must(hero.get(Position));
    const vel = must(hero.get(Velocity));
    const h = must(hero.get(Hero));
    const origin = { x: pos.x, y: pos.y + halfHeight, z: pos.z };
    const hit = physics.castRay(new RAPIER.Ray(origin, down), SHADOW_REACH, true, undefined, undefined, collider);
    return {
      phase: run.phase,
      falls: run.falls,
      steps: run.steps,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      vx: vel.x,
      vy: vel.y,
      vz: vel.z,
      grounded: h.grounded,
      facing: h.facing,
      groundY: hit ? origin.y - hit.timeOfImpact : null,
    };
  }

  return {
    step,
    snapshot,
    restart(): void {
      world.set(Run, { phase: 'playing', falls: 0, steps: 0 });
      toStart();
    },
    dispose(): void {
      controller.free();
      physics.free();
      world.destroy();
    },
  };
}

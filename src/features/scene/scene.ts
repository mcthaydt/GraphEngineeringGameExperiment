import { DirectionalLight, View3D } from '@pixi/3d';
import { lerp } from '../../lib/maths';
import type { Course } from '../course/course';
import type { SimEvent, Snapshot } from '../sim/sim';
import type { Tuning } from '../tuning/tuning';
import { SUN_FROM } from './baked';
import { createBackdrop } from './backdrop';
import { createCameraRig } from './camera';
import { createEffects } from './effects';
import { createFlag } from './flag';
import { createHero } from './hero';
import { PALETTE } from './palette';
import { createClouds, createPlatforms } from './world';

export { SKY_CSS } from './palette';
export { pickQuality, rendererName, type Quality, type QualitySettings } from './quality';

export interface Scene {
  readonly view: View3D;
  /** Reacts to what happened in the simulation: dust, squash, confetti. */
  react(events: readonly SimEvent[], now: Snapshot): void;
  /** Draws the moment `alpha` of the way from `before` to `now`. `dt` is seconds since the last draw. */
  draw(before: Snapshot, now: Snapshot, alpha: number, dt: number, aspect: number): void;
}

export function createScene(course: Course, tuning: Tuning): Scene {
  const view = new View3D({
    autoResize: true,
    environment: { skyColor: 0xdcefff, groundColor: 0x9a8f78, intensity: 0.75 },
    resolution: 'inherit',
  });
  const sun = new DirectionalLight({ color: PALETTE.sun, intensity: 3, position: SUN_FROM });
  sun.lookAt({ x: 0, y: 0, z: 0 });

  const hero = createHero();
  const flag = createFlag(course.flag);
  const effects = createEffects();
  view.root.addChild(sun, createPlatforms(course), flag.node, hero.node, effects.node, createClouds(course), createBackdrop(course));

  const rig = createCameraRig(tuning.camera, { ...course.start, grounded: true });
  let seconds = 0;
  let snapCamera = true;
  // Where the hero was last drawn, so an exit puff can go there.
  let shown = { x: course.start.x, y: course.start.y, z: course.start.z };
  let hops = 0;

  return {
    view,
    react(events, now) {
      for (const event of events) {
        if (event.type === 'jump') {
          hero.jump();
          effects.takeoff(now.x, now.y, now.z);
        } else if (event.type === 'land') {
          hero.land(event.speed);
          effects.land(now.x, now.y, now.z, event.speed);
        } else if (event.type === 'fall') {
          snapCamera = true;
          // The hero leaves in a puff where it was last drawn, then pops back in at the start.
          effects.vanish(shown.x, shown.y, shown.z);
          hero.arrive();
          effects.arrive(now.x, now.y, now.z);
        } else {
          effects.confetti(course.flag.x, course.flag.y, course.flag.z);
        }
      }
      hero.cheer(now.phase === 'won');
    },
    draw(before, now, alpha, dt, aspect) {
      seconds += dt;
      // A respawn is a teleport: gliding the picture between the two places would look like a glitch.
      const jumped = Math.abs(now.z - before.z) + Math.abs(now.y - before.y) > 3;
      const mix = (a: number, b: number): number => (jumped ? b : lerp(a, b, alpha));
      const pose = { ...now, x: mix(before.x, now.x), y: mix(before.y, now.y), z: mix(before.z, now.z) };

      hero.update(pose, dt);
      flag.update(seconds);
      effects.shadow(pose.x, pose.z, now.groundY, now.groundY === null ? 0 : pose.y + hero.lift() - now.groundY);
      effects.update(dt);
      if (hero.hops() > hops) effects.sparkle(pose.x, pose.y, pose.z);
      hops = hero.hops();
      shown = { x: pose.x, y: pose.y, z: pose.z };

      if (snapCamera) rig.snap(pose);
      snapCamera = false;
      const shot = rig.update(pose, dt, aspect);
      view.camera.fov = shot.fov;
      view.camera.position.set(shot.position.x, shot.position.y, shot.position.z);
      view.camera.lookAt(shot.target);
    },
  };
}

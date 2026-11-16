import { describe, expect, it } from 'vitest';
import { createCameraRig } from '../../../src/features/scene/camera';
import { loadTuning } from '../../../src/features/tuning/tuning';

const tuning = loadTuning().camera;

describe('camera rig', () => {
  it('sits behind and above the player, looking ahead', () => {
    const rig = createCameraRig(tuning, { x: 0, y: 0, z: 0, grounded: true });
    const pose = rig.update({ x: 0, y: 0, z: 0, grounded: true }, 1 / 60, 16 / 9);
    expect(pose.position.z).toBeGreaterThan(5);
    expect(pose.position.y).toBeGreaterThan(3);
    expect(pose.target.z).toBeLessThan(0);
  });

  it('does not bob with a jump, but follows a landing on higher ground', () => {
    const rig = createCameraRig(tuning, { x: 0, y: 0, z: 0, grounded: true });
    const base = rig.update({ x: 0, y: 0, z: 0, grounded: true }, 1 / 60, 16 / 9).position.y;
    let pose = rig.update({ x: 0, y: 2, z: 0, grounded: false }, 1 / 60, 16 / 9);
    expect(pose.position.y).toBe(base);
    for (let i = 0; i < 240; i++) pose = rig.update({ x: 0, y: 2, z: 0, grounded: true }, 1 / 60, 16 / 9);
    expect(pose.position.y).toBeCloseTo(base + 2, 1);
  });

  it('pulls back and widens on a tall phone screen', () => {
    const at = { x: 0, y: 0, z: 0, grounded: true };
    const wide = createCameraRig(tuning, at).update(at, 1 / 60, 16 / 9);
    const tall = createCameraRig(tuning, at).update(at, 1 / 60, 9 / 19.5);
    expect(tall.position.z).toBeGreaterThan(wide.position.z);
    expect(tall.fov).toBeGreaterThan(wide.fov);
  });

  const settle = (rig: ReturnType<typeof createCameraRig>, at: { x: number; y: number; z: number; grounded: boolean; vz?: number }, aspect = 16 / 9) => {
    let pose = rig.update(at, 1 / 60, aspect);
    for (let i = 0; i < 300; i++) pose = rig.update(at, 1 / 60, aspect);
    return pose;
  };

  it('stops following a fall down, so the hero stays in view until it is put back', () => {
    const at = { x: 0, y: 0, z: 0, grounded: true };
    const rig = createCameraRig(tuning, at);
    const resting = settle(rig, at).position.y;
    let pose = resting;
    for (let i = 0; i < 120; i++) pose = rig.update({ x: 0, y: -6, z: -3, grounded: false }, 1 / 60, 16 / 9).position.y;
    expect(pose).toBeGreaterThanOrEqual(resting - tuning.fall_follow - 1e-6);
  });

  it('catches up with a step up in about half a second', () => {
    const rig = createCameraRig(tuning, { x: 0, y: 0, z: 0, grounded: true });
    const base = settle(rig, { x: 0, y: 0, z: 0, grounded: true }).position.y;
    let pose = rig.update({ x: 0, y: 1.2, z: 0, grounded: true }, 1 / 60, 16 / 9);
    for (let i = 1; i < 30; i++) pose = rig.update({ x: 0, y: 1.2, z: 0, grounded: true }, 1 / 60, 16 / 9);
    expect(base + 1.2 - pose.position.y).toBeLessThan(0.2);
  });

  it('looks further ahead the faster the hero runs', () => {
    const still = settle(createCameraRig(tuning, { x: 0, y: 0, z: 0, grounded: true }), { x: 0, y: 0, z: 0, grounded: true });
    const running = settle(createCameraRig(tuning, { x: 0, y: 0, z: 0, grounded: true }), { x: 0, y: 0, z: 0, grounded: true, vz: -7 });
    expect(running.target.z).toBeLessThan(still.target.z - 0.5);
  });

  describe('how big the hero is', () => {
    // Share of the screen's height taken by a hero this tall (about what hero.ts draws), standing where the camera looks.
    const HERO = 1.65;
    const share = (aspect: number): { hero: number; nextPlatformInView: boolean } => {
      const at = { x: 0, y: 0, z: 0, grounded: true };
      const pose = settle(createCameraRig(tuning, at), at, aspect);
      const { position: c, target: g } = pose;
      const forward = norm({ x: g.x - c.x, y: g.y - c.y, z: g.z - c.z });
      const right = norm(cross(forward, { x: 0, y: 1, z: 0 }));
      const up = cross(right, forward);
      const project = (p: { x: number; y: number; z: number }): number => {
        const d = { x: p.x - c.x, y: p.y - c.y, z: p.z - c.z };
        const depth = d.x * forward.x + d.y * forward.y + d.z * forward.z;
        return (d.x * up.x + d.y * up.y + d.z * up.z) / depth / Math.tan((pose.fov * Math.PI) / 360);
      };
      // Screen height spans -1 to 1 in these units. The next platform's far edge is about 7 m ahead of the hero.
      const next = project({ x: 0, y: 0, z: -7 });
      return { hero: (project({ x: 0, y: HERO, z: 0 }) - project({ x: 0, y: 0, z: 0 })) / 2, nextPlatformInView: next < 0.8 };
    };

    it.each([
      ['computer', 1280 / 720],
      ['tablet', 810 / 1080],
      ['small phone', 375 / 667],
    ])('is at least a tenth of the screen on a %s, with the next platform in view', (_name, aspect) => {
      const { hero, nextPlatformInView } = share(aspect);
      expect(hero).toBeGreaterThanOrEqual(0.1);
      expect(nextPlatformInView).toBe(true);
    });
  });
});

type V = { x: number; y: number; z: number };
const cross = (a: V, b: V): V => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: V): V => {
  const l = Math.hypot(a.x, a.y, a.z);
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};

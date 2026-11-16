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
});

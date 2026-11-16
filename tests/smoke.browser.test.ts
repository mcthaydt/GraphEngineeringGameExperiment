import { expect, it } from 'vitest';

// Proves the browser runner starts Chromium with WebGL, which the 3D renderer needs.
it('runs in Chromium with WebGL2', () => {
  const gl = document.createElement('canvas').getContext('webgl2');
  expect(gl).not.toBeNull();
});

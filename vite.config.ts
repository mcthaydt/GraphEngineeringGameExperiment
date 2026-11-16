import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Rapier's entry imports its .wasm as a module. Served unbundled (as the browser tests do), Vite loads the
// wasm glue twice under two URLs and the second copy never gets the wasm. This entry wires it up once.
const rapierWasm = (): Plugin => ({
  name: 'rapier-wasm-once',
  enforce: 'pre',
  load(id) {
    if (!id.endsWith('/rapier3d-deterministic/rapier_wasm3d.js')) return null;
    return [
      `import * as glue from './rapier_wasm3d_bg.js';`,
      `import url from './rapier_wasm3d_bg.wasm?url';`,
      `const { instance } = await WebAssembly.instantiateStreaming(fetch(url), { './rapier_wasm3d_bg.js': glue });`,
      `glue.__wbg_set_wasm(instance.exports);`,
      `export * from './rapier_wasm3d_bg.js';`,
    ].join('\n');
  },
});

export default defineConfig({
  plugins: [svelte(), rapierWasm()],
  // The physics entry awaits its wasm at the top level.
  build: { target: 'es2022' },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-deterministic'],
    // Named up front so the browser tests never reload half way through to bundle them.
    include: ['@pixi/3d', 'pixi.js', 'effect', 'koota', 'zod', 'smol-toml'],
  },
  test: {
    projects: [
      {
        // Not a test: `npm run capture` plays the game and saves screenshots and clip frames for people to look at.
        extends: true,
        test: {
          name: 'capture',
          include: ['scripts/**/*.capture.ts'],
          testTimeout: 600_000,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            screenshotFailures: false,
          },
        },
      },
      {
        extends: true,
        test: { name: 'unit', include: ['tests/**/*.test.ts'], exclude: ['tests/**/*.browser.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['tests/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});

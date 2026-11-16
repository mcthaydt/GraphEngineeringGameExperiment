// Measures real frame times of the built game in headless Chromium on the computer profile.
// Usage: npm run build && npm run measure            (exits 1 when the budget is missed)
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const BUDGET_MS = 16.7;
const SECONDS = Number(process.env.DURATION ?? 10);
// UNCAPPED=1 lets frames run faster than the screen, to see how much room is left. It is for diagnosis, not the budget.
const UNCAPPED = process.env.UNCAPPED === '1';
const PORT = 4188;
const url = `http://localhost:${PORT}/${process.env.QUERY ?? ''}`;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ args: UNCAPPED ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : [] });
let failed: boolean;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  for (let tries = 0; ; tries++) {
    try {
      await page.goto(url);
      break;
    } catch (error) {
      if (tries > 40) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  const info = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return { quality: window.__game?.quality, renderer: gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown' };
  });

  // Play for real while measuring: run forward and jump, so dust, respawns and the moving camera are all in the numbers.
  await page.keyboard.down('ArrowUp');
  const jumping = setInterval(() => void page.keyboard.press('Space', { delay: 250 }).catch(() => undefined), 900);
  await page.evaluate(
    (ms) =>
      new Promise<void>((resolve) => {
        const end = performance.now() + ms;
        const tick = (): void => void (performance.now() < end ? requestAnimationFrame(tick) : resolve());
        requestAnimationFrame(tick);
      }),
    (SECONDS + 1) * 1000,
  );
  clearInterval(jumping);
  await page.keyboard.up('ArrowUp');

  // The first second is left out: shaders compile on first sight.
  const times = (await page.evaluate(() => window.__game?.frameTimes() ?? [])).slice(60).sort((a, b) => a - b);
  const at = (share: number): number => times[Math.min(times.length - 1, Math.floor(times.length * share))] ?? Infinity;
  const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
  const slow = times.filter((t) => t > BUDGET_MS * 1.5).length;
  const report = {
    ...info,
    viewport: '1280x720',
    frames: times.length,
    meanMs: +mean.toFixed(2),
    medianMs: +at(0.5).toFixed(2),
    p95Ms: +at(0.95).toFixed(2),
    p99Ms: +at(0.99).toFixed(2),
    maxMs: +at(1).toFixed(2),
    framesOverOneAndAHalfBudgets: slow,
  };
  console.log(JSON.stringify(report, null, 2));
  // The screen refreshes every 16.67 ms, so single frames wobble around that by a fraction of a millisecond.
  // The budget holds when the average is within it and almost no frame is missed outright.
  failed = UNCAPPED || times.length < SECONDS * 50 || mean > BUDGET_MS || slow > times.length * 0.01;
  console.log(UNCAPPED ? 'Uncapped run: for diagnosis only' : failed ? `MISSED the ${BUDGET_MS} ms budget` : `Within the ${BUDGET_MS} ms budget`);
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);

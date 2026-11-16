import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { loadFirstCourse, platformUnder } from '../src/features/course/course';
import { startGame, type Game } from '../src/index';
import { createAutopilot } from '../tests/playtest/autopilot';
import { DEVICES, pressKeys } from '../tests/playtest/drive';

// Screenshots and clip frames of a real run, at full quality, with time stepped by hand so they repeat exactly.
const course = loadFirstCourse();
const CLIP_SECONDS = 10;
const CLIP_FPS = 30;
const slug = (name: string): string => name.replace(/\s+/g, '-');

async function open(width: number, height: number, touch: boolean): Promise<{ game: Game; mount: HTMLElement }> {
  await page.viewport(width, height);
  const mount = document.createElement('div');
  mount.style.cssText = 'position:fixed;inset:0';
  document.body.appendChild(mount);
  const game = await startGame({ mount, clock: 'manual', quality: 'full', touch, sound: false });
  return { game, mount };
}

const save = (path: string): Promise<unknown> => page.screenshot({ path: `../captures/${path}`, save: true });

it.each(DEVICES)('stills on a $name', async (device) => {
  const { game, mount } = await open(device.width, device.height, device.touch);
  const pilot = createAutopilot(course);
  const name = slug(device.name);
  const taken = new Set<string>();
  const once = async (label: string): Promise<void> => {
    if (taken.has(label)) return;
    taken.add(label);
    await save(`${name}-${label}.png`);
  };

  game.advance(400);
  await once('1-start');
  for (let t = 0; t < 40_000 && game.snapshot().phase !== 'won'; t += 50) {
    const s = game.snapshot();
    pressKeys(pilot(s));
    game.advance(50);
    const on = platformUnder(course, s.x, s.z);
    const index = on ? course.platforms.indexOf(on) : -1;
    if (!s.grounded && s.vy > 2 && s.z < -4) await once('2-first-jump');
    if (index === 4 && !s.grounded) await once('3-stepping-stones');
    if (index === 7 && s.grounded) await once('4-last-leap');
  }
  game.advance(900);
  // The win screen pops in with CSS animations, which run on real time: wait for them to finish.
  await expect.element(page.getByRole('button', { name: 'Play again' })).toBeVisible();
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  await once('5-you-made-it');
  pressKeys({ left: false, right: false, up: false, down: false, jump: false });
  game.dispose();
  mount.remove();
});

it('clip frames on a computer', async () => {
  const { game, mount } = await open(1280, 720, false);
  const pilot = createAutopilot(course);
  const frameMs = 1000 / CLIP_FPS;
  game.advance(300);
  for (let i = 0; i < CLIP_SECONDS * CLIP_FPS; i++) {
    // The pilot waits a moment at the start, as a new player would.
    if (i > CLIP_FPS * 0.8) pressKeys(pilot(game.snapshot()));
    game.advance(frameMs);
    await save(`clip/frame-${String(i).padStart(4, '0')}.png`);
  }
  pressKeys({ left: false, right: false, up: false, down: false, jump: false });
  game.dispose();
  mount.remove();
});

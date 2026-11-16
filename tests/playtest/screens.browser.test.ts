import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { loadFirstCourse } from '../../src/features/course/course';
import { PALETTE } from '../../src/features/scene/palette';
import { startGame, type Game } from '../../src/index';
import { createAutopilot, type Wish } from './autopilot';
import { KEYS, pressKeys } from './drive';

const course = loadFirstCourse();
const NOTHING: Wish = { left: false, right: false, up: false, down: false, jump: false };
const SIZES = [
  { name: 'computer', width: 1280, height: 720, touch: false },
  { name: 'tablet', width: 810, height: 1080, touch: true },
  { name: 'small phone', width: 375, height: 667, touch: true },
  { name: 'phone on its side', width: 667, height: 375, touch: true },
] as const;

let game: Game | undefined;
let mount: HTMLElement | undefined;
afterEach(() => {
  for (const code of Object.values(KEYS)) window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  game?.dispose();
  mount?.remove();
  game = mount = undefined;
});

async function open(width: number, height: number, touch: boolean): Promise<Game> {
  await page.viewport(width, height);
  mount = document.createElement('div');
  mount.style.cssText = 'position:fixed;inset:0';
  document.body.appendChild(mount);
  game = await startGame({ mount, clock: 'manual', quality: 'lite', touch, sound: false });
  return game;
}

const text = (): string => mount?.textContent ?? '';
const sign = (): HTMLElement => {
  const element = mount?.querySelector<HTMLElement>('[data-testid="sign"]');
  if (!element) throw new Error('No sign on screen');
  return element;
};
const hintsShowing = (): boolean => !sign().classList.contains('gone');

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Where pixels of one colour are on screen right now (with the words hidden), as a box. */
async function whereIs(colour: number, close = 30): Promise<Box | undefined> {
  const hud = mount?.querySelector<HTMLElement>('.hud');
  if (hud) hud.style.visibility = 'hidden';
  const shot = await page.screenshot({ base64: true, save: false });
  if (hud) hud.style.visibility = '';
  const image = new Image();
  image.src = `data:image/png;base64,${shot}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No 2d canvas');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  const want = [(colour >> 16) & 255, (colour >> 8) & 255, colour & 255];
  let box: { left: number; top: number; right: number; bottom: number } | undefined;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (Math.abs((data[i] ?? 0) - (want[0] ?? 0)) + Math.abs((data[i + 1] ?? 0) - (want[1] ?? 0)) + Math.abs((data[i + 2] ?? 0) - (want[2] ?? 0)) < close) {
        box = box
          ? { left: Math.min(box.left, x), top: Math.min(box.top, y), right: Math.max(box.right, x), bottom: Math.max(box.bottom, y) }
          : { left: x, top: y, right: x, bottom: y };
      }
    }
  }
  return box;
}

const overlaps = (a: Box, b: DOMRect, margin = 0): boolean =>
  a.left < b.right + margin && a.right > b.left - margin && a.top < b.bottom + margin && a.bottom > b.top - margin;

function flyToFlag(g: Game): void {
  const pilot = createAutopilot(course);
  for (let t = 0; t < 40_000 && g.snapshot().phase !== 'won'; t += 50) {
    pressKeys(pilot(g.snapshot()));
    g.advance(50);
  }
  pressKeys(NOTHING);
}

describe.each(SIZES)('on a $name', (size) => {
  it('keeps the words off the flag when the game opens', async () => {
    const g = await open(size.width, size.height, size.touch);
    g.advance(400);
    const flag = await whereIs(PALETTE.flag);
    expect(flag, 'the flag is on screen').toBeDefined();
    if (!flag) return;
    expect(overlaps(flag, sign().getBoundingClientRect()), `flag ${JSON.stringify(flag)} under the words`).toBe(false);
  });

  it('keeps the win screen off the hero and the flag, through all its hops', { timeout: 60_000 }, async () => {
    const g = await open(size.width, size.height, size.touch);
    flyToFlag(g);
    expect(g.snapshot().phase).toBe('won');
    await page.getByRole('button', { name: 'Play again' }).hover();
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
    const win = mount?.querySelector('[role="dialog"]');
    const parts = [...(win?.querySelectorAll('h1, button') ?? [])].map((part) => part.getBoundingClientRect());
    expect(parts.length).toBeGreaterThan(0);
    // The hero cheers with hops, so look at it through a whole run of them, not at one moment.
    const things = [PALETTE.flag, PALETTE.hero, PALETTE.heroViolet, PALETTE.heroBoot];
    for (let look = 0; look < 24; look++) {
      for (const colour of things) {
        const box = await whereIs(colour);
        if (!box) continue;
        for (const part of parts) {
          expect(overlaps(box, part, 12), `${colour.toString(16)} ${JSON.stringify(box)} under the win words`).toBe(false);
        }
      }
      g.advance(110);
    }
    expect(await whereIs(PALETTE.hero), 'the hero is on screen').toBeDefined();
  });
});

describe('the words after a fall', () => {
  it('says oops for a moment, then goes back to the goal', async () => {
    const g = await open(375, 667, false);
    pressKeys({ ...NOTHING, left: true });
    for (let t = 0; t < 6000 && g.snapshot().falls === 0; t += 50) g.advance(50);
    pressKeys(NOTHING);
    expect(g.snapshot().falls).toBe(1);
    await tick();
    expect(text()).toContain('Oops! Try again');
    g.advance(3000);
    await tick();
    expect(text()).not.toContain('Oops');
    expect(text()).toContain('Run to the flag!');
  });
});

describe('the hints', () => {
  it('fade once the player has run and jumped', async () => {
    const g = await open(1280, 720, false);
    expect(hintsShowing()).toBe(true);
    pressKeys({ ...NOTHING, up: true });
    g.advance(600);
    pressKeys({ ...NOTHING, up: true, jump: true });
    g.advance(100);
    pressKeys({ ...NOTHING });
    g.advance(100);
    await tick();
    expect(hintsShowing()).toBe(false);
  });

  it('come back for a player who stands still for a while', async () => {
    const g = await open(1280, 720, false);
    pressKeys({ ...NOTHING, up: true });
    g.advance(600);
    pressKeys({ ...NOTHING, up: true, jump: true });
    g.advance(100);
    pressKeys(NOTHING);
    g.advance(500);
    await tick();
    expect(hintsShowing()).toBe(false);
    g.advance(9000);
    await tick();
    expect(hintsShowing()).toBe(true);
  });

  it('come back after a fall and after Play again', async () => {
    const g = await open(1280, 720, false);
    pressKeys({ ...NOTHING, up: true });
    g.advance(600);
    pressKeys({ ...NOTHING, up: true, jump: true });
    g.advance(100);
    pressKeys({ ...NOTHING, left: true });
    for (let t = 0; t < 6000 && g.snapshot().falls === 0; t += 50) g.advance(50);
    pressKeys(NOTHING);
    await tick();
    expect(hintsShowing()).toBe(true);

    flyToFlag(g);
    await page.getByRole('button', { name: 'Play again' }).click();
    expect(hintsShowing()).toBe(true);
    expect(sign().querySelectorAll('.done')).toHaveLength(0);
  });
});

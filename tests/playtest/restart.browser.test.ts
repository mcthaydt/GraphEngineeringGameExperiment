import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { loadFirstCourse } from '../../src/features/course/course';
import { startGame, type Game } from '../../src/index';
import { createAutopilot, type Wish } from './autopilot';
import { KEYS, pressKeys } from './drive';

// After a win or a fall the hero must stand still until the player does something new, even if a
// key or a thumb is still down from before.
const course = loadFirstCourse();
const NOTHING: Wish = { left: false, right: false, up: false, down: false, jump: false };
let game: Game | undefined;
let mount: HTMLElement | undefined;
afterEach(() => {
  for (const code of Object.values(KEYS)) window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  game?.dispose();
  mount?.remove();
  game = mount = undefined;
});

async function open(touch: boolean): Promise<Game> {
  await page.viewport(375, 667);
  mount = document.createElement('div');
  mount.style.cssText = 'position:fixed;inset:0';
  document.body.appendChild(mount);
  game = await startGame({ mount, clock: 'manual', quality: 'lite', touch, sound: false });
  return game;
}

const find = (testId: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`No ${testId} on screen`);
  return element;
};
const pointer = (type: string, x: number, y: number, pointerId: number): PointerEvent =>
  new PointerEvent(type, { clientX: x, clientY: y, pointerId, pointerType: 'touch', bubbles: true, cancelable: true });
const key = (type: 'keydown' | 'keyup', code: string, repeat = false): boolean =>
  window.dispatchEvent(new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true }));

/** Puts a thumb on the stick, pushed `up` (toward the flag) and/or left, and returns how to move or lift it. */
function thumbOnStick(pointerId: number, dx: number, dy: number) {
  const box = find('stick').getBoundingClientRect();
  const at = { x: box.left + box.width / 2 + dx * box.width * 0.45, y: box.top + box.height / 2 + dy * box.height * 0.45 };
  find('stick').dispatchEvent(pointer('pointerdown', at.x, at.y, pointerId));
  return {
    move: () => find('stick').dispatchEvent(pointer('pointermove', at.x + 1, at.y, pointerId)),
    lift: () => find('stick').dispatchEvent(pointer('pointerup', at.x, at.y, pointerId)),
  };
}

/** Drives the on-screen stick and jump button the way two thumbs would. */
function createThumbs() {
  let down = false;
  let jumpDown = false;
  return (wish: Wish): void => {
    const stick = find('stick');
    const box = stick.getBoundingClientRect();
    const x = (wish.right ? 1 : 0) - (wish.left ? 1 : 0);
    const y = (wish.down ? 1 : 0) - (wish.up ? 1 : 0);
    const cx = box.left + box.width / 2 + x * box.width * 0.45;
    const cy = box.top + box.height / 2 + y * box.height * 0.45;
    if (x || y) {
      stick.dispatchEvent(pointer(down ? 'pointermove' : 'pointerdown', cx, cy, 1));
      down = true;
    } else if (down) {
      stick.dispatchEvent(pointer('pointerup', cx, cy, 1));
      down = false;
    }
    if (wish.jump !== jumpDown) {
      find('jump').dispatchEvent(pointer(wish.jump ? 'pointerdown' : 'pointerup', 0, 0, 2));
      jumpDown = wish.jump;
    }
  };
}

function fly(g: Game, act: (wish: Wish) => void): void {
  const pilot = createAutopilot(course);
  for (let t = 0; t < 40_000 && g.snapshot().phase !== 'won'; t += 50) {
    act(pilot(g.snapshot()));
    g.advance(50);
  }
  expect(g.snapshot().phase).toBe('won');
}

const standsStill = (g: Game, startY: number): void => {
  const s = g.snapshot();
  expect(s.phase).toBe('playing');
  expect(s.falls).toBe(0);
  expect(Math.hypot(s.x - course.start.x, s.z - course.start.z)).toBeLessThan(0.1);
  expect(Math.abs(s.vz) + Math.abs(s.vx)).toBeLessThan(0.01);
  expect(s.y).toBeCloseTo(startY, 1);
};

describe('after Play again', () => {
  it('stands still with an arrow key and Space still held', async () => {
    const g = await open(false);
    const startY = g.snapshot().y;
    fly(g, pressKeys);
    key('keydown', 'ArrowUp');
    key('keydown', 'Space');
    await page.getByRole('button', { name: 'Play again' }).click();
    // The keys are let go only now, with the button in focus, and typed again by the keyboard's own repeat.
    key('keydown', 'ArrowUp', true);
    key('keydown', 'Space', true);
    g.advance(2500);
    standsStill(g, startY);
  });

  it('runs again once the key is let go and pressed again', async () => {
    const g = await open(false);
    fly(g, pressKeys);
    key('keydown', 'ArrowUp');
    await page.getByRole('button', { name: 'Play again' }).click();
    g.advance(300);
    key('keyup', 'ArrowUp');
    key('keydown', 'ArrowUp');
    g.advance(500);
    expect(course.start.z - g.snapshot().z).toBeGreaterThan(1);
  });

  it('stands still with a thumb still on the stick, as it is at the moment of the win', async () => {
    const g = await open(true);
    const startY = g.snapshot().y;
    const pilot = createAutopilot(course);
    const thumbs = createThumbs();
    for (let t = 0; t < 40_000 && g.snapshot().phase !== 'won'; t += 50) {
      thumbs(pilot(g.snapshot()));
      g.advance(50);
    }
    expect(g.snapshot().phase).toBe('won');
    await page.getByRole('button', { name: 'Play again' }).click();
    g.advance(2500);
    standsStill(g, startY);
  });
});

describe('after a fall', () => {
  it('stands still while the key that ran off the edge is still held', async () => {
    const g = await open(false);
    const startY = g.snapshot().y;
    pressKeys({ ...NOTHING, left: true });
    for (let t = 0; t < 6000 && g.snapshot().falls === 0; t += 50) g.advance(50);
    expect(g.snapshot().falls).toBe(1);
    key('keydown', 'ArrowLeft', true);
    g.advance(2500);
    const s = g.snapshot();
    expect(s.falls).toBe(1);
    expect(Math.hypot(s.x - course.start.x, s.z - course.start.z)).toBeLessThan(0.1);
    expect(s.y).toBeCloseTo(startY, 1);
  });

  it('stands still while the thumb that ran off the edge stays on the stick, then runs on a new touch', async () => {
    const g = await open(true);
    const thumb = thumbOnStick(1, -1, 0);
    for (let t = 0; t < 6000 && g.snapshot().falls === 0; t += 50) g.advance(50);
    expect(g.snapshot().falls).toBe(1);
    thumb.move();
    g.advance(1500);
    const s = g.snapshot();
    expect(s.falls).toBe(1);
    expect(Math.hypot(s.x - course.start.x, s.z - course.start.z)).toBeLessThan(0.1);
    thumb.lift();
    thumbOnStick(2, 0, -1);
    g.advance(500);
    expect(course.start.z - g.snapshot().z).toBeGreaterThan(1);
  });
});

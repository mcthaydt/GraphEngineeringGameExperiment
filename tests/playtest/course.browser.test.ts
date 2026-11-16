import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { loadFirstCourse } from '../../src/features/course/course';
import { startGame, type Game } from '../../src/index';
import { createAutopilot, type Wish } from './autopilot';
import { DEVICES, KEYS, pressKeys } from './drive';

const course = loadFirstCourse();
const DECISION_MS = 50;
let game: Game | undefined;
let mount: HTMLElement | undefined;
afterEach(() => {
  for (const code of Object.values(KEYS)) window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  game?.dispose();
  mount?.remove();
  game = mount = undefined;
});

async function open(device: (typeof DEVICES)[number], touch: boolean): Promise<Game> {
  await page.viewport(device.width, device.height);
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

/** Drives the on-screen stick and jump button the way two thumbs would. */
function createThumbs() {
  let stickDown = false;
  let jumpDown = false;
  return (wish: Wish): void => {
    const stick = find('stick');
    const box = stick.getBoundingClientRect();
    const x = (wish.right ? 1 : 0) - (wish.left ? 1 : 0);
    const y = (wish.down ? 1 : 0) - (wish.up ? 1 : 0);
    const cx = box.left + box.width / 2 + x * box.width * 0.45;
    const cy = box.top + box.height / 2 + y * box.height * 0.45;
    if (x || y) {
      stick.dispatchEvent(pointer(stickDown ? 'pointermove' : 'pointerdown', cx, cy, 1));
      stickDown = true;
    } else if (stickDown) {
      stick.dispatchEvent(pointer('pointerup', cx, cy, 1));
      stickDown = false;
    }
    if (wish.jump !== jumpDown) {
      find('jump').dispatchEvent(pointer(wish.jump ? 'pointerdown' : 'pointerup', 0, 0, 2));
      jumpDown = wish.jump;
    }
  };
}

function playToFlag(g: Game, act: (wish: Wish) => void, limitSeconds = 40): void {
  const pilot = createAutopilot(course);
  for (let t = 0; t < limitSeconds * 1000 && g.snapshot().phase !== 'won'; t += DECISION_MS) {
    act(pilot(g.snapshot()));
    g.advance(DECISION_MS);
  }
}

const text = (): string => mount?.textContent ?? '';

describe.each(DEVICES)('on a $name', (device) => {
  it('says what to do before anything is pressed', async () => {
    await open(device, device.touch);
    expect(text()).toContain('Run to the flag!');
    expect(text()).toContain('Jump');
  });

  it('reaches the flag with the keyboard, then plays again', async () => {
    const g = await open(device, false);
    playToFlag(g, pressKeys);
    expect(g.snapshot().phase).toBe('won');
    expect(g.snapshot().falls).toBe(0);
    await expect.element(page.getByRole('heading', { name: 'You made it!' })).toBeVisible();
    const again = page.getByRole('button', { name: 'Play again' });
    await expect.element(again).toBeVisible();
    await again.click();
    expect(g.snapshot().phase).toBe('playing');
    expect(g.snapshot().z).toBeCloseTo(course.start.z, 1);
    expect(text()).not.toContain('You made it!');
  });

  it('reaches the flag with the touch stick and jump button', async () => {
    const g = await open(device, true);
    playToFlag(g, createThumbs());
    expect(g.snapshot().phase).toBe('won');
    await expect.element(page.getByRole('button', { name: 'Play again' })).toBeVisible();
  });

  it('puts the player back at the start after falling off', async () => {
    const g = await open(device, false);
    pressKeys({ left: true, right: false, up: false, down: false, jump: false });
    for (let t = 0; t < 6000 && g.snapshot().falls === 0; t += DECISION_MS) g.advance(DECISION_MS);
    const s = g.snapshot();
    expect(s.falls).toBe(1);
    expect(s.phase).toBe('playing');
    expect(Math.hypot(s.x - course.start.x, s.z - course.start.z)).toBeLessThan(0.5);
    expect(text()).not.toContain('You made it!');
  });
});

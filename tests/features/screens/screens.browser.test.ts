import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScreens, type Screens } from '../../../src/features/screens/screens';
import { showStartFailure } from '../../../src/features/screens/failure';
import { contrastRatio, effectiveBackground, parseColor } from './colour';

let screens: Screens | undefined;
let mount: HTMLElement | undefined;
afterEach(() => {
  screens?.dispose();
  mount?.remove();
  screens = mount = undefined;
});

/** Mounts the screens and lets them settle, as the seconds before a real thumb touches would. */
async function open(touch: boolean) {
  mount = document.createElement('div');
  mount.style.cssText = 'position:fixed;inset:0';
  document.body.appendChild(mount);
  const handlers = { onStick: vi.fn(), onJump: vi.fn(), onAgain: vi.fn() };
  screens = createScreens(mount, touch, handlers);
  await tick();
  return { mount, handlers, screens };
}
const find = (testId: string): HTMLElement | null => document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const touchDown = (x: number, y: number, target: EventTarget = window): void => {
  target.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', bubbles: true }));
};

/** The words an element shows, one per element with its own text. */
function textElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('*')].filter((element) =>
    [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
  );
}

describe('keys or touch controls', () => {
  it('shows the keys and no touch controls on a computer', async () => {
    const { mount } = await open(false);
    expect(mount.textContent).toContain('Space');
    expect(mount.textContent).toContain('Run to the flag!');
    expect(find('stick')).toBeNull();
    expect(find('jump')).toBeNull();
  });

  it('shows the stick and Jump and no keys on a phone or tablet', async () => {
    const { mount } = await open(true);
    expect(find('stick')).not.toBeNull();
    expect(find('jump')).not.toBeNull();
    expect(mount.textContent).not.toContain('Space');
    expect(mount.textContent).toContain('Run to the flag!');
  });

  it('brings the touch controls up, and takes the keys away, when a finger first touches a computer screen', async () => {
    const { mount } = await open(false);
    touchDown(10, 10);
    await tick();
    expect(find('stick')).not.toBeNull();
    expect(mount.textContent).not.toContain('Space');
  });

  it('does not bring them up for a mouse click', async () => {
    await open(false);
    window.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse' }));
    await tick();
    expect(find('stick')).toBeNull();
  });
});

describe('the stick', () => {
  it('works for a thumb that lands a little outside the circle', async () => {
    const { handlers } = await open(true);
    const circle = find('stick')?.getBoundingClientRect();
    if (!circle) throw new Error('no stick');
    const x = circle.left + circle.width / 2;
    const y = circle.top - 28;
    const hit = document.elementFromPoint(x, y);
    expect(hit?.closest('[data-testid="stick-zone"]')).not.toBeNull();
    touchDown(x, y, hit ?? window);
    await tick();
    expect(handlers.onStick).toHaveBeenCalled();
    const [, z] = handlers.onStick.mock.calls.at(-1) ?? [];
    expect(z).toBeLessThan(-0.5);
  });

  it('leaves the ground well away from it alone', async () => {
    await open(true);
    const circle = find('stick')?.getBoundingClientRect();
    if (!circle) throw new Error('no stick');
    const hit = document.elementFromPoint(circle.left + circle.width / 2, circle.top - 140);
    expect(hit?.closest('[data-testid="stick-zone"]')).toBeNull();
  });

  it('says how to use it, and pulses until the first move', async () => {
    const { mount } = await open(true);
    expect(mount.textContent).toContain('Drag to move');
    expect(find('stick')?.classList.contains('hint')).toBe(true);
  });

  it('lets go of the stick and Jump when the controls go away', async () => {
    const { handlers, screens } = await open(true);
    touchDown(0, 0, find('stick') ?? window);
    handlers.onStick.mockClear();
    screens.ui.won = true;
    await tick();
    expect(handlers.onStick).toHaveBeenLastCalledWith(0, 0);
    expect(handlers.onJump).toHaveBeenLastCalledWith(false);
  });
});

describe('readable and big enough', () => {
  it.each([false, true])('has text at least 4.5 to 1 against the worst background, touch %s', async (touch) => {
    const { mount } = await open(touch);
    const worst: string[] = [];
    for (const element of textElements(mount)) {
      const style = getComputedStyle(element);
      const ratio = contrastRatio(parseColor(style.color), effectiveBackground(element, [255, 255, 255]));
      if (ratio < 4.5) worst.push(`${element.textContent?.trim()} ${ratio.toFixed(2)}`);
    }
    expect(worst).toEqual([]);
  });

  it('has a win screen with text at least 4.5 to 1 and a button at least 64 px tall', async () => {
    const { mount, screens } = await open(true);
    screens.ui.won = true;
    await tick();
    // The win screen pops in; measure it once it has settled.
    await Promise.all(document.getAnimations().map((animation) => animation.finished));
    for (const element of textElements(mount)) {
      const ratio = contrastRatio(parseColor(getComputedStyle(element).color), effectiveBackground(element, [255, 255, 255]));
      expect(ratio, element.textContent ?? '').toBeGreaterThanOrEqual(4.5);
    }
    const button = mount.querySelector('button');
    expect(button?.getBoundingClientRect().height).toBeGreaterThanOrEqual(64);
  });

  it('has no touch target under 48 px', async () => {
    const { mount } = await open(true);
    for (const element of mount.querySelectorAll<HTMLElement>('button, [data-testid="stick"]')) {
      const box = element.getBoundingClientRect();
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(48);
    }
  });
});

describe('the start failure screen', () => {
  it('says it in plain words and has one big working button', () => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    const reload = vi.fn();
    const dispose = showStartFailure(mount, reload);
    try {
      expect(mount.textContent).toContain('will not open');
      expect(mount.textContent?.toLowerCase()).not.toContain('browser');
      const buttons = mount.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      const button = buttons[0];
      expect(button?.textContent?.trim()).toBe('Try again');
      expect(button?.getBoundingClientRect().height).toBeGreaterThanOrEqual(64);
      button?.click();
      expect(reload).toHaveBeenCalledOnce();
      for (const element of textElements(mount)) {
        const ratio = contrastRatio(parseColor(getComputedStyle(element).color), effectiveBackground(element, [255, 255, 255]));
        expect(ratio, element.textContent ?? '').toBeGreaterThanOrEqual(4.5);
      }
    } finally {
      dispose();
    }
  });
});

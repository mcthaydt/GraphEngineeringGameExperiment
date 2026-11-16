import { mount, unmount } from 'svelte';
import Hud from './Hud.svelte';
import { createHudState, type HudState } from './hud-state.svelte';

export type { HudState } from './hud-state.svelte';

export interface ScreenHandlers {
  onStick(x: number, z: number): void;
  onJump(held: boolean): void;
  onAgain(): void;
}

export interface Screens {
  readonly ui: HudState;
  dispose(): void;
}

/** True on a phone or tablet, where there is no keyboard to play with. */
export const prefersTouch = (): boolean => window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

/** Draws the words, the touch controls and the win screen over the game. */
export function createScreens(target: HTMLElement, touch: boolean, handlers: ScreenHandlers): Screens {
  const ui = createHudState(touch);
  // A finger on the screen of a laptop with a touchscreen should bring the touch controls up too.
  const onPointer = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') ui.touch = true;
  };
  window.addEventListener('pointerdown', onPointer);
  const hud = mount(Hud, { target, props: { ui, ...handlers } });
  return {
    ui,
    dispose() {
      window.removeEventListener('pointerdown', onPointer);
      void unmount(hud);
    },
  };
}

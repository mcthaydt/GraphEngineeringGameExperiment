import type { HintView } from './hints';

export interface HudState extends HintView {
  /** True once the flag is reached: shows "You made it!". */
  won: boolean;
  /** Show the on-screen stick and jump button instead of the key hints. */
  touch: boolean;
  /** Goes up by one each time held controls are let go for the player (a win, a fall, Play again). */
  letGo: number;
}

export function createHudState(touch: boolean): HudState {
  const ui: HudState = $state({ won: false, touch, showMoveHint: true, showJumpHint: true, fell: false, letGo: 0 });
  return ui;
}

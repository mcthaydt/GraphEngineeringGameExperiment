export interface HudState {
  /** True once the flag is reached: shows "You made it!". */
  won: boolean;
  /** Show the on-screen stick and jump button. */
  touch: boolean;
  /** The opening hints, each hidden once the player has done the thing. */
  showMoveHint: boolean;
  showJumpHint: boolean;
}

export function createHudState(touch: boolean): HudState {
  const ui: HudState = $state({ won: false, touch, showMoveHint: true, showJumpHint: true });
  return ui;
}

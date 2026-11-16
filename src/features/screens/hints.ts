/** How long a player may stand still before the hints come back to help. */
export const IDLE_SECONDS = 8;
/** How long "Oops!" stays up after a fall. */
export const OOPS_SECONDS = 1.8;
/** How far the hero must run, in metres, to count as having learned to move. */
const RUN_DISTANCE = 2;

export interface HintView {
  showMoveHint: boolean;
  showJumpHint: boolean;
  fell: boolean;
}

interface Spot {
  readonly x: number;
  readonly z: number;
}

/** Decides when the move and jump hints show: at the start, after a fall, after Play again, and for a lost player. */
export function createHints(view: HintView, start: Spot) {
  let from = start;
  let idle = 0;
  let oops = 0;

  const show = (where: Spot): void => {
    view.showMoveHint = view.showJumpHint = true;
    from = where;
    idle = 0;
  };

  return {
    /** Call once per simulation step. `active` is true while the player is pressing something. */
    step(seconds: number, at: Spot, active: boolean): void {
      oops = Math.max(0, oops - seconds);
      view.fell = oops > 0;
      if (view.showMoveHint && Math.hypot(at.x - from.x, at.z - from.z) > RUN_DISTANCE) view.showMoveHint = false;
      if (view.showMoveHint || view.showJumpHint) return;
      idle = active ? 0 : idle + seconds;
      if (idle >= IDLE_SECONDS) show(at);
    },
    jumped(): void {
      view.showJumpHint = false;
    },
    fell(back: Spot): void {
      oops = OOPS_SECONDS;
      view.fell = true;
      show(back);
    },
    reset(back: Spot): void {
      oops = 0;
      view.fell = false;
      show(back);
    },
  };
}

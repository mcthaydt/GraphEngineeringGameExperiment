/** The simulation always advances in steps of this size, so a run plays the same on every machine. */
export const STEP_SECONDS = 1 / 60;
export const STEP_MS = 1000 / 60;

export const msToSteps = (ms: number): number => Math.max(1, Math.round(ms / STEP_MS));

/** Turns elapsed real time into whole simulation steps, keeping the remainder for drawing in between. */
export function createStepper(maxStepsPerFrame = 5) {
  let owed = 0;
  return {
    /** Returns how many steps to run now. A long stall is dropped, not replayed. */
    feed(elapsedMs: number): number {
      owed += Math.max(0, elapsedMs);
      const steps = Math.min(maxStepsPerFrame, Math.floor(owed / STEP_MS + 1e-9));
      owed = steps === maxStepsPerFrame ? 0 : owed - steps * STEP_MS;
      return steps;
    },
    /** How far between the last two steps the present moment is, 0 to 1. */
    get alpha(): number {
      return clampUnit(owed / STEP_MS);
    },
    reset(): void {
      owed = 0;
    },
  };
}

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

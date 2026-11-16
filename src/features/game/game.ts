import { Data, Effect } from 'effect';
import { Application } from 'pixi.js';
import { createStepper, STEP_SECONDS } from '../../lib/steps';
import { loadFirstCourse } from '../course/course';
import { createInput } from '../input/input';
import { createScene, pickQuality, SKY_CSS, type Quality } from '../scene/scene';
import { createScreens, prefersTouch } from '../screens/screens';
import { createSim, type Snapshot } from '../sim/sim';
import { createSound } from '../sound/sound';
import { loadTuning } from '../tuning/tuning';

export interface GameOptions {
  /** The element the game fills. */
  readonly mount: HTMLElement;
  /** `manual` freezes time until `advance` is called: tests use it to play the same run every time. */
  readonly clock?: 'real' | 'manual';
  readonly quality?: Quality | 'auto';
  readonly touch?: boolean;
  readonly sound?: boolean;
}

export interface Game {
  readonly quality: Quality;
  snapshot(): Snapshot;
  /** Moves time forward by hand (manual clock) and draws one frame. */
  advance(ms: number): void;
  restart(): void;
  /** Milliseconds between the most recent frames drawn on the real clock. */
  frameTimes(): number[];
  dispose(): void;
}

export class BootError extends Data.TaggedError('BootError')<{ readonly step: string; readonly cause: unknown }> {}

const attempt = <A>(step: string, run: () => A | Promise<A>): Effect.Effect<A, BootError> =>
  Effect.tryPromise({ try: async () => run(), catch: (cause) => new BootError({ step, cause }) });

const FRAME_HISTORY = 1200;

const boot = (options: GameOptions): Effect.Effect<Game, BootError> =>
  Effect.gen(function* () {
    const { mount } = options;
    const manual = options.clock === 'manual';
    const tuning = yield* attempt('read the settings', loadTuning);
    const course = yield* attempt('read the course', loadFirstCourse);
    const quality = yield* attempt('check the graphics', () => pickQuality(options.quality ?? 'auto'));

    const app = new Application();
    yield* attempt('start the graphics', () =>
      app.init({
        resizeTo: mount,
        antialias: quality.antialias,
        resolution: quality.resolution(window.devicePixelRatio || 1),
        autoDensity: true,
        // The sky is a CSS gradient behind a see-through canvas: painting it in 3D cost 3 ms a frame, this costs nothing.
        backgroundAlpha: 0,
        autoStart: !manual,
        preference: 'webgl',
      }),
    );
    mount.style.background = SKY_CSS;
    mount.appendChild(app.canvas);

    const sim = yield* attempt('build the course', () => createSim(course, tuning));
    const scene = yield* attempt('draw the course', () => createScene(course, tuning));
    app.stage.addChild(scene.view);

    const input = createInput();
    const sound = options.sound === false ? undefined : createSound();
    const screens = createScreens(mount, options.touch ?? prefersTouch(), {
      onStick: input.setStick,
      onJump: input.setTouchJump,
      onAgain: () => restart(),
    });

    const stepper = createStepper();
    const frames: number[] = [];
    let before = sim.snapshot();
    let now = before;
    let lastFrame: number | undefined;

    function restart(): void {
      sim.restart();
      stepper.reset();
      before = now = sim.snapshot();
      screens.ui.won = false;
      scene.react([{ type: 'fall' }], now);
    }

    function frame(elapsedMs: number): void {
      const steps = stepper.feed(elapsedMs);
      for (let i = 0; i < steps; i++) {
        const events = sim.step(input.read());
        before = now;
        now = sim.snapshot();
        scene.react(events, now);
        for (const event of events) {
          sound?.play(event);
          if (event.type === 'jump') screens.ui.showJumpHint = false;
          if (event.type === 'win') screens.ui.won = true;
        }
        if (Math.hypot(now.x - course.start.x, now.z - course.start.z) > 2) screens.ui.showMoveHint = false;
      }
      scene.draw(before, now, stepper.alpha, elapsedMs / 1000, app.screen.width / Math.max(1, app.screen.height));
    }

    app.ticker.add((ticker) => {
      const stamp = performance.now();
      if (lastFrame !== undefined) {
        frames.push(stamp - lastFrame);
        if (frames.length > FRAME_HISTORY) frames.shift();
      }
      lastFrame = stamp;
      frame(ticker.elapsedMS);
    });
    frame(0);
    app.render();

    return {
      quality: quality.name,
      snapshot: () => now,
      advance(ms) {
        // Whole steps only, so a test's run never depends on leftover time.
        for (let left = ms; left > 1e-6; left -= STEP_SECONDS * 1000) frame(STEP_SECONDS * 1000);
        app.render();
      },
      restart,
      frameTimes: () => [...frames],
      dispose() {
        screens.dispose();
        sound?.dispose();
        input.dispose();
        sim.dispose();
        app.destroy({ removeView: true }, { children: true });
      },
    };
  });

/** Starts the game inside `options.mount`. Rejects with a `BootError` naming the step that failed. */
export const startGame = (options: GameOptions): Promise<Game> => Effect.runPromise(boot(options));

<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import './theme.css';

  interface Props {
    onStick: (x: number, z: number) => void;
    onJump: (held: boolean) => void;
    /** Goes up when the game lets go of held controls: a thumb already down is then ignored until it lifts. */
    letGo: number;
    /** Pulse the stick, then the Jump button, to show what to do with them. */
    pulseStick: boolean;
    pulseJump: boolean;
  }
  let { onStick, onJump, letGo, pulseStick, pulseJump }: Props = $props();

  // How far the thumb travels from the stick's middle for full speed, as a share of the stick's radius.
  const REACH = 0.8;
  let knob = $state({ x: 0, y: 0 });
  let jumping = $state(false);
  let circle: HTMLElement | undefined = $state();
  let stickPointer: number | undefined;
  let seen = untrack(() => letGo);

  /** A thumb that was down when the game let go of everything must lift and touch again. */
  function dropOldThumbs(): void {
    if (letGo === seen) return;
    seen = letGo;
    stickPointer = undefined;
    knob = { x: 0, y: 0 };
    jumping = false;
  }
  $effect(() => {
    void letGo;
    dropOldThumbs();
  });
  // The win screen takes the controls away while a thumb may still be on them: nothing may stay held.
  onDestroy(() => {
    onStick(0, 0);
    onJump(false);
  });

  function moveStick(event: PointerEvent): void {
    if (!circle) return;
    const box = circle.getBoundingClientRect();
    const radius = (box.width / 2) * REACH;
    let x = (event.clientX - (box.left + box.width / 2)) / radius;
    let y = (event.clientY - (box.top + box.height / 2)) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    knob = { x, y };
    // Up the screen is away from the camera, which is -z in the world.
    onStick(x, y);
  }
  function stickDown(event: PointerEvent): void {
    dropOldThumbs();
    stickPointer = event.pointerId;
    try {
      // Keeps the thumb's moves coming even when it slides off the zone. A pointer that is already gone can't be captured.
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* the thumb has lifted already: nothing to capture */
    }
    moveStick(event);
  }
  function stickMove(event: PointerEvent): void {
    dropOldThumbs();
    if (event.pointerId === stickPointer) moveStick(event);
  }
  function stickUp(event: PointerEvent): void {
    dropOldThumbs();
    if (event.pointerId !== stickPointer) return;
    stickPointer = undefined;
    knob = { x: 0, y: 0 };
    onStick(0, 0);
  }
  function jump(held: boolean): void {
    dropOldThumbs();
    jumping = held;
    onJump(held);
  }
</script>

<!-- The zone is the circle plus a margin all round, so a thumb that lands near the stick still works. -->
<div
  class="zone"
  data-testid="stick-zone"
  role="application"
  aria-label="Move"
  onpointerdown={stickDown}
  onpointermove={stickMove}
  onpointerup={stickUp}
  onpointercancel={stickUp}
>
  <div class="stick" class:hint={pulseStick} data-testid="stick" bind:this={circle}>
    <div class="knob" style:transform="translate({knob.x * 34}%, {knob.y * 34}%)"></div>
  </div>
  <span class="label">Drag to move</span>
</div>
<button
  class="jump"
  class:held={jumping}
  class:hint={pulseJump}
  data-testid="jump"
  tabindex="-1"
  onpointerdown={() => jump(true)}
  onpointerup={() => jump(false)}
  onpointercancel={() => jump(false)}
  onpointerleave={() => jump(false)}
  onmousedown={(event) => event.preventDefault()}
  oncontextmenu={(event) => event.preventDefault()}>Jump</button
>

<style>
  .zone,
  .jump {
    position: absolute;
    pointer-events: auto;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }
  .zone {
    --pad: 40px;
    left: calc(max(5vw, env(safe-area-inset-left)) - var(--pad));
    bottom: calc(max(5vh, env(safe-area-inset-bottom)) - var(--pad));
    padding: var(--pad);
  }
  .stick {
    position: relative;
    width: clamp(132px, 34vmin, 200px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: rgb(255 255 255 / 22%);
    border: 4px solid rgb(255 255 255 / 75%);
    box-sizing: border-box;
  }
  .stick.hint::after,
  .jump.hint::after {
    content: '';
    position: absolute;
    inset: -8px;
    border: 5px solid #fff;
    border-radius: 50%;
    animation: ring 1.4s ease-out infinite;
  }
  .knob {
    position: absolute;
    inset: 27%;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 4px 0 rgb(0 40 90 / 35%);
  }
  .label {
    position: absolute;
    left: 50%;
    bottom: 100%;
    transform: translateX(-50%);
    padding: 6px 16px 8px;
    border-radius: 999px;
    background: var(--pill);
    color: #fff;
    font-size: 20px;
    font-weight: 800;
    white-space: nowrap;
  }
  .jump {
    right: max(5vw, env(safe-area-inset-right));
    bottom: max(5vh, env(safe-area-inset-bottom));
    width: clamp(116px, 30vmin, 170px);
    aspect-ratio: 1;
    border: 0;
    border-radius: 50%;
    background: var(--gold);
    color: var(--gold-text);
    font: inherit;
    font-size: clamp(24px, 6vmin, 34px);
    font-weight: 900;
    box-shadow:
      0 8px 0 var(--gold-deep),
      0 14px 22px rgb(0 30 80 / 35%);
  }
  .jump.held {
    transform: translateY(6px);
    box-shadow: 0 2px 0 var(--gold-deep);
  }
  @keyframes ring {
    from {
      transform: scale(0.9);
      opacity: 0.9;
    }
    to {
      transform: scale(1.2);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .stick.hint::after,
    .jump.hint::after {
      animation: none;
    }
  }
</style>

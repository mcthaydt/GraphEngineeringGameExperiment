<script lang="ts">
  interface Props {
    onStick: (x: number, z: number) => void;
    onJump: (held: boolean) => void;
  }
  let { onStick, onJump }: Props = $props();

  // How far the thumb travels from the stick's middle for full speed, as a share of the stick's radius.
  const REACH = 0.8;
  let knob = $state({ x: 0, y: 0 });
  let jumping = $state(false);
  let stickPointer: number | undefined;

  function moveStick(event: PointerEvent): void {
    const pad = event.currentTarget as HTMLElement;
    const box = pad.getBoundingClientRect();
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
    stickPointer = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    moveStick(event);
  }
  function stickMove(event: PointerEvent): void {
    if (event.pointerId === stickPointer) moveStick(event);
  }
  function stickUp(event: PointerEvent): void {
    if (event.pointerId !== stickPointer) return;
    stickPointer = undefined;
    knob = { x: 0, y: 0 };
    onStick(0, 0);
  }
  function jump(held: boolean): void {
    jumping = held;
    onJump(held);
  }
</script>

<div
  class="stick"
  data-testid="stick"
  role="application"
  aria-label="Move"
  onpointerdown={stickDown}
  onpointermove={stickMove}
  onpointerup={stickUp}
  onpointercancel={stickUp}
>
  <div class="knob" style:transform="translate({knob.x * 34}%, {knob.y * 34}%)"></div>
  <span class="label">Move</span>
</div>
<button
  class="jump"
  class:held={jumping}
  data-testid="jump"
  onpointerdown={() => jump(true)}
  onpointerup={() => jump(false)}
  onpointercancel={() => jump(false)}
  onpointerleave={() => jump(false)}
  oncontextmenu={(event) => event.preventDefault()}>Jump</button
>

<style>
  .stick,
  .jump {
    position: absolute;
    bottom: max(5vh, env(safe-area-inset-bottom));
    pointer-events: auto;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }
  .stick {
    left: max(5vw, env(safe-area-inset-left));
    width: clamp(132px, 34vmin, 200px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: rgb(255 255 255 / 22%);
    border: 4px solid rgb(255 255 255 / 75%);
    box-sizing: border-box;
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
    left: 0;
    right: 0;
    top: -1.6em;
    text-align: center;
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 2px 0 #1d4f8f;
  }
  .jump {
    right: max(5vw, env(safe-area-inset-right));
    width: clamp(116px, 30vmin, 170px);
    aspect-ratio: 1;
    border: 0;
    border-radius: 50%;
    background: #ffc93c;
    color: #4a2a00;
    font: inherit;
    font-size: clamp(24px, 6vmin, 34px);
    font-weight: 900;
    box-shadow:
      0 8px 0 #d9931a,
      0 14px 22px rgb(0 30 80 / 35%);
  }
  .jump.held {
    transform: translateY(6px);
    box-shadow: 0 2px 0 #d9931a;
  }
</style>

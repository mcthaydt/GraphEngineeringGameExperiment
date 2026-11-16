<script lang="ts">
  import type { HudState } from './hud-state.svelte';
  import TouchControls from './TouchControls.svelte';

  interface Props {
    ui: HudState;
    onStick: (x: number, z: number) => void;
    onJump: (held: boolean) => void;
    onAgain: () => void;
  }
  let { ui, onStick, onJump, onAgain }: Props = $props();

  let again: HTMLButtonElement | undefined = $state();
  // Focus the button so Enter or Space plays again without reaching for the mouse.
  $effect(() => {
    if (ui.won) again?.focus();
  });
</script>

<div class="hud">
  {#if !ui.won}
    <div class="hints" class:gone={!ui.showMoveHint && !ui.showJumpHint}>
      <p class="goal">Run to the flag!</p>
      {#if !ui.touch}
        <p class="keys">
          <span class:done={!ui.showMoveHint}><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> Move</span>
          <span class:done={!ui.showJumpHint}><kbd class="wide">Space</kbd> Jump</span>
        </p>
      {/if}
    </div>
    {#if ui.touch}
      <TouchControls {onStick} {onJump} />
    {/if}
  {:else}
    <div class="win" role="dialog" aria-labelledby="win-title">
      <h1 id="win-title">You made it!</h1>
      <button bind:this={again} onclick={onAgain}>Play again</button>
    </div>
  {/if}
</div>

<style>
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    font-family: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
    color: #fff;
    user-select: none;
    -webkit-user-select: none;
  }
  .hints {
    position: absolute;
    top: max(4vh, env(safe-area-inset-top));
    left: 0;
    right: 0;
    text-align: center;
    transition: opacity 0.6s ease;
  }
  .hints.gone {
    opacity: 0;
  }
  .goal {
    margin: 0;
    font-size: clamp(28px, 6vmin, 52px);
    font-weight: 800;
    text-shadow:
      0 3px 0 #1d4f8f,
      0 6px 14px rgb(0 40 90 / 45%);
  }
  .keys {
    display: flex;
    justify-content: center;
    gap: 28px;
    margin: 14px 0 0;
    font-size: clamp(18px, 3vmin, 24px);
    font-weight: 700;
    text-shadow: 0 2px 0 #1d4f8f;
  }
  .keys span {
    transition: opacity 0.4s ease;
  }
  .keys .done {
    opacity: 0.25;
  }
  kbd {
    display: inline-block;
    min-width: 1.6em;
    margin: 0 2px;
    padding: 4px 6px;
    border-radius: 8px;
    background: #fff;
    color: #1d3557;
    font: inherit;
    text-shadow: none;
    box-shadow: 0 3px 0 #9fb4cc;
  }
  kbd.wide {
    padding: 4px 18px;
  }
  .win {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4vh;
    padding: 24px;
    background: rgb(20 60 120 / 35%);
    pointer-events: auto;
    animation: appear 0.35s ease-out both;
  }
  h1 {
    margin: 0;
    font-size: clamp(44px, 12vmin, 110px);
    font-weight: 900;
    text-align: center;
    text-shadow:
      0 5px 0 #d9541e,
      0 12px 24px rgb(0 30 80 / 50%);
    animation: pop 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  button {
    min-width: min(80vw, 360px);
    min-height: 84px;
    padding: 18px 44px;
    border: 0;
    border-radius: 999px;
    background: #ffc93c;
    color: #4a2a00;
    font: inherit;
    font-size: clamp(28px, 6vmin, 44px);
    font-weight: 900;
    box-shadow:
      0 8px 0 #d9931a,
      0 16px 28px rgb(0 30 80 / 40%);
    cursor: pointer;
    touch-action: manipulation;
    animation: pop 0.5s 0.15s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  button:hover,
  button:focus-visible {
    background: #ffd966;
    outline: 5px solid #fff;
    outline-offset: 4px;
  }
  button:active {
    transform: translateY(6px);
    box-shadow:
      0 2px 0 #d9931a,
      0 6px 12px rgb(0 30 80 / 40%);
  }
  @keyframes appear {
    from {
      opacity: 0;
    }
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .win,
    h1,
    button {
      animation: none;
    }
  }
</style>

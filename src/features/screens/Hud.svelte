<script lang="ts">
  import type { HudState } from './hud-state.svelte';
  import TouchControls from './TouchControls.svelte';
  import './theme.css';

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
    <!-- Top left: the far flag sits top centre when the game opens, and this must never cover it. -->
    <div class="sign" data-testid="sign" class:gone={!ui.showMoveHint && !ui.showJumpHint && !ui.fell}>
      <p class="goal">{ui.fell ? 'Oops! Try again!' : 'Run to the flag!'}</p>
      {#if !ui.touch}
        <div class="keys" data-testid="keys">
          <span class="group" class:done={!ui.showMoveHint}>
            <span class="caps"><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></span>
            <span class="name">Move</span>
          </span>
          <span class="group" class:done={!ui.showJumpHint}>
            <span class="caps"><kbd class="wide">Space</kbd></span>
            <span class="name">Jump</span>
          </span>
        </div>
      {/if}
    </div>
    {#if ui.touch}
      <TouchControls {onStick} {onJump} letGo={ui.letGo} pulseStick={ui.showMoveHint} pulseJump={!ui.showMoveHint && ui.showJumpHint} />
    {/if}
  {:else}
    <!-- Low on the screen, so the hero and the flag stay in view. -->
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
    color: #fff;
    user-select: none;
    -webkit-user-select: none;
  }
  .sign {
    position: absolute;
    top: max(16px, env(safe-area-inset-top));
    left: max(16px, env(safe-area-inset-left));
    box-sizing: border-box;
    max-width: min(40vw, 460px);
    padding: 12px 20px 14px;
    border-radius: 28px;
    background: var(--pill);
    transition:
      opacity 0.6s ease,
      visibility 0s;
  }
  .sign.gone {
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.6s ease,
      visibility 0s 0.6s;
  }
  .goal {
    margin: 0;
    font-size: clamp(20px, 4.2vmin, 40px);
    font-weight: 900;
    line-height: 1.15;
  }
  .keys {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 24px;
    margin-top: 12px;
  }
  .group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .caps {
    display: flex;
    gap: 4px;
  }
  .name {
    font-size: clamp(16px, 2.6vmin, 22px);
    font-weight: 800;
  }
  .done .name::before {
    content: '✓ ';
    color: #8be58f;
  }
  kbd {
    display: inline-block;
    min-width: 1.6em;
    padding: 4px 6px;
    border-radius: 8px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: clamp(16px, 2.6vmin, 22px);
    font-weight: 800;
    text-align: center;
    box-shadow: 0 3px 0 #9fb4cc;
  }
  kbd.wide {
    padding: 4px 18px;
  }
  .done kbd {
    background: #d4f6d6;
  }
  .win {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 2vh;
    padding: 24px 24px max(6vh, env(safe-area-inset-bottom));
    animation: appear 0.35s ease-out both;
  }
  h1 {
    margin: 0;
    padding: 0.12em 0.6em 0.18em;
    border-radius: 999px;
    background: var(--pill);
    font-size: clamp(34px, 9vmin, 90px);
    font-weight: 900;
    text-align: center;
    animation: pop 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  button {
    min-width: min(80vw, 360px);
    min-height: clamp(72px, 11vmin, 90px);
    padding: 18px 44px;
    border: 0;
    border-radius: 999px;
    background: var(--gold);
    color: var(--gold-text);
    font: inherit;
    font-size: clamp(28px, 6vmin, 44px);
    font-weight: 900;
    box-shadow:
      0 8px 0 var(--gold-deep),
      0 16px 28px rgb(0 30 80 / 40%);
    cursor: pointer;
    pointer-events: auto;
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
      0 2px 0 var(--gold-deep),
      0 6px 12px rgb(0 30 80 / 40%);
  }
  /* A phone on its side has little height: keep the words and button small enough to stay below the hero. */
  @media (max-height: 480px) {
    .win {
      gap: 6px;
      padding-bottom: max(8px, env(safe-area-inset-bottom));
    }
    h1 {
      font-size: 30px;
    }
    button {
      min-height: 64px;
      padding-block: 10px;
    }
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
    button,
    .sign {
      animation: none;
      transition: none;
    }
  }
</style>

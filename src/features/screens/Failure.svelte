<script lang="ts">
  import './theme.css';

  interface Props {
    onTryAgain: () => void;
  }
  let { onTryAgain }: Props = $props();
</script>

<div class="failure" role="alert">
  <h1>Sorry! The game will not open here.</h1>
  <button onclick={onTryAgain}>Try again</button>
  <p>Still stuck? Try another phone or computer.</p>
</div>

<style>
  .failure {
    position: fixed;
    inset: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4vh;
    padding: 24px;
    background: #cdeeff;
    color: var(--ink);
    text-align: center;
  }
  h1 {
    margin: 0;
    max-width: 18em;
    font-size: clamp(28px, 6vmin, 48px);
    font-weight: 900;
  }
  p {
    margin: 0;
    font-size: clamp(20px, 3.4vmin, 28px);
    font-weight: 700;
  }
  button {
    min-width: min(80vw, 360px);
    min-height: 84px;
    padding: 18px 44px;
    border: 0;
    border-radius: 999px;
    background: var(--gold);
    color: var(--gold-text);
    font: inherit;
    font-size: clamp(28px, 6vmin, 44px);
    font-weight: 900;
    box-shadow: 0 8px 0 var(--gold-deep);
    cursor: pointer;
    touch-action: manipulation;
  }
  button:hover,
  button:focus-visible {
    background: #ffd966;
    outline: 5px solid var(--ink);
    outline-offset: 4px;
  }
  button:active {
    transform: translateY(6px);
    box-shadow: 0 2px 0 var(--gold-deep);
  }
</style>

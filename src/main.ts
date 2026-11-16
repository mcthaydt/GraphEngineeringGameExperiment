import { startGame, type Game } from './index';
import './main.css';

declare global {
  interface Window {
    /** The running game, for the playtests and for poking at in the console. */
    __game?: Game;
  }
}

const mount = document.getElementById('game') ?? document.body;
const params = new URLSearchParams(location.search);
const quality = params.get('quality');

startGame({
  mount,
  clock: params.get('clock') === 'manual' ? 'manual' : 'real',
  quality: quality === 'lite' || quality === 'full' ? quality : 'auto',
  ...(params.has('touch') ? { touch: params.get('touch') === '1' } : {}),
}).then(
  (game) => {
    window.__game = game;
    document.body.dataset.ready = 'true';
  },
  (error: unknown) => {
    console.error(error);
    mount.innerHTML = '<p class="sorry">Sorry, the game could not start here.<br />Please try a newer browser, like Chrome.</p>';
    document.body.dataset.ready = 'failed';
  },
);

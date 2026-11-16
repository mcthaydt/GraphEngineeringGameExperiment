import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'src/main.css'), 'utf8');

describe('the page before the game is ready', () => {
  it('says "Getting ready" in the page itself, so there are words before any script has run', () => {
    expect(html).toMatch(/class="loading"[^>]*>[\s\S]*Getting ready/);
  });

  it('hides the words as soon as the game says it is ready or has failed to start', () => {
    expect(css).toMatch(/body\[data-ready\]\s+\.loading\s*\{[^}]*display:\s*none/);
  });

  it('moves a little so nobody thinks it has frozen, unless motion is turned down', () => {
    expect(css).toMatch(/@keyframes/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';

// Lowest first. A unit may import only from units earlier in this list (or itself).
const LAYERS = ['lib'] as const;

const SRC = resolve(import.meta.dirname, '../src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|svelte)$/.test(p) ? [p] : [];
  });
}

/** `lib`, a feature name, or `root` for src/index.ts and src/main.ts. */
function unitOf(file: string): string {
  const parts = relative(SRC, file).split(/[\\/]/);
  if (parts[0] === 'features' && parts[1]) return parts[1];
  if (parts[0] === 'lib') return 'lib';
  return 'root';
}

function imports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]/g)].map((m) =>
    resolve(dirname(file), m[1] ?? ''),
  );
}

function violations(graph: Map<string, string[]>, layers: readonly string[]): string[] {
  const rank = (u: string) => (u === 'root' ? Infinity : layers.indexOf(u));
  const out: string[] = [];
  for (const [f, targets] of graph) {
    const from = unitOf(f);
    if (from !== 'root' && rank(from) === -1) out.push(`${relative(SRC, f)}: unit "${from}" is not in LAYERS`);
    for (const target of targets) {
      const to = unitOf(target);
      if (to === from) continue;
      if (rank(to) >= rank(from)) out.push(`${relative(SRC, f)} imports upward or sideways into "${to}"`);
    }
  }
  return out;
}

describe('architecture', () => {
  it('imports only go down the layer list, so there are no cycles', () => {
    const graph = new Map(files(SRC).map((f) => [f, imports(f)]));
    expect(violations(graph, LAYERS)).toEqual([]);
  });

  it('catches an upward import, a sideways import and an unlisted feature', () => {
    const at = (p: string) => join(SRC, p);
    const graph = new Map([
      [at('lib/maths.ts'), [at('features/player/player.ts')]],
      [at('features/player/player.ts'), [at('features/level/level.ts')]],
      [at('features/level/level.ts'), [at('lib/maths.ts')]],
    ]);
    expect(violations(graph, ['lib', 'level', 'player'])).toHaveLength(1);
    expect(violations(graph, ['lib', 'player', 'level'])).toHaveLength(2);
    expect(violations(graph, ['lib', 'level'])).toHaveLength(2);
  });

  it('keeps tests out of src', () => {
    expect(files(SRC).filter((f) => /\.test\.ts$/.test(f))).toEqual([]);
  });
});

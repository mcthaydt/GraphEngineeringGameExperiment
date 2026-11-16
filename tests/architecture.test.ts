import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
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

/** Paths are compared without extensions, so `./a` and `./a.ts` are the same node. */
const key = (p: string) => p.replace(/\.(ts|svelte|js)$/, '').replace(/[\\/]index$/, '');

/** `lib`, a feature name, or `root` for src/index.ts and src/main.ts. */
function unitOf(file: string): string {
  const parts = relative(SRC, file).split(/[\\/]/);
  if (parts[0] === 'features' && parts[1]) return parts[1];
  if (parts[0] === 'lib') return 'lib';
  return 'root';
}

/** Relative specifiers from static, side-effect, re-export and dynamic imports. */
function specifiers(source: string): string[] {
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]*)['"]/g;
  return [...source.matchAll(pattern)].flatMap((m) => (m[1] ? [m[1]] : []));
}

function graphOf(paths: string[]): Map<string, string[]> {
  return new Map(
    paths.map((f) => [key(f), specifiers(readFileSync(f, 'utf8')).map((s) => key(resolve(dirname(f), s)))]),
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

/** Every file-level cycle, whatever units the files are in. */
function cycles(graph: Map<string, string[]>): string[] {
  const state = new Map<string, 'open' | 'done'>();
  const out: string[] = [];
  const visit = (node: string, path: string[]) => {
    if (state.get(node) === 'done') return;
    if (state.get(node) === 'open') {
      out.push([...path.slice(path.indexOf(node)), node].map((p) => relative(SRC, p)).join(' -> '));
      return;
    }
    state.set(node, 'open');
    for (const next of graph.get(node) ?? []) if (graph.has(next)) visit(next, [...path, node]);
    state.set(node, 'done');
  };
  for (const node of graph.keys()) visit(node, []);
  return out;
}

describe('architecture', () => {
  const graph = graphOf(files(SRC));

  it('imports only go down the layer list', () => {
    expect(violations(graph, LAYERS)).toEqual([]);
  });

  it('has no import cycles', () => {
    expect(cycles(graph)).toEqual([]);
  });

  it('keeps tests out of src', () => {
    expect(files(SRC).filter((f) => /\.(test|spec)\.ts$/.test(f))).toEqual([]);
  });

  it('sees side-effect, dynamic and re-export imports', () => {
    const source = `import '../a';\nconst b = () => import('./b');\nexport * from "../c";\nimport { d } from './d';\nimport x from 'pixi.js';`;
    expect(specifiers(source)).toEqual(['../a', './b', '../c', './d']);
  });

  it('catches an upward import, a sideways import and an unlisted feature', () => {
    const at = (p: string) => join(SRC, p);
    const fake = new Map([
      [at('lib/maths'), [at('features/player/player')]],
      [at('features/player/player'), [at('features/level/level')]],
      [at('features/level/level'), [at('lib/maths')]],
    ]);
    expect(violations(fake, ['lib', 'level', 'player'])).toHaveLength(1);
    expect(violations(fake, ['lib', 'player', 'level'])).toHaveLength(2);
    expect(violations(fake, ['lib', 'level'])).toHaveLength(2);
  });

  it('catches a cycle inside one feature', () => {
    const at = (p: string) => join(SRC, p);
    const fake = new Map([
      [at('features/x/a'), [at('features/x/b')]],
      [at('features/x/b'), [at('features/x/a')]],
    ]);
    expect(cycles(fake)).toHaveLength(1);
  });
});

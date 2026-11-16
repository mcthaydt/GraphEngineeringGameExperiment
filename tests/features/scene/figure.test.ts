import { describe, expect, it } from 'vitest';
import { bakeShapes, type Shape } from '../../../src/features/scene/figure';

const LINE = 0x2a1950;
const THICK = 0.05;
const ball = (rest: Partial<Shape> = {}): Shape => ({ x: 0, y: 0, z: 0, sx: 1, color: 0xff7a2f, ...rest });
const curve = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linear = (hex: number): number[] => [16, 8, 0].map((s) => curve(((hex >> s) & 255) / 255));

describe('bakeShapes', () => {
  it('merges many shapes into one mesh with a colour for every corner', () => {
    const one = bakeShapes([ball()], LINE, THICK);
    const three = bakeShapes([ball(), ball({ x: 2 }), ball({ x: -2 })], LINE, THICK);
    expect(one.positions.length).toBeGreaterThan(0);
    expect(one.colors.length / 4).toBe(one.positions.length / 3);
    expect(three.positions.length).toBe(one.positions.length * 3);
    expect(three.indices.length).toBe(one.indices.length * 3);
    expect(Math.max(...three.indices)).toBe(three.positions.length / 3 - 1);
  });

  it('adds an outline copy only when asked, as extra corners and triangles in the same mesh', () => {
    const plain = bakeShapes([ball()], LINE, THICK);
    const lined = bakeShapes([ball({ line: true })], LINE, THICK);
    expect(lined.positions.length).toBe(plain.positions.length * 2);
    expect(lined.indices.length).toBe(plain.indices.length * 2);
  });

  it('draws the outline after the shape, bigger, with its triangles turned inside out so only the far side shows', () => {
    const plain = bakeShapes([ball()], LINE, THICK);
    const lined = bakeShapes([ball({ line: true })], LINE, THICK);
    const corners = plain.positions.length / 3;
    // The shape itself comes first and is untouched.
    expect(Array.from(lined.indices.slice(0, plain.indices.length))).toEqual(Array.from(plain.indices));
    // Every outline corner sits a little further out than the shape's own.
    for (let i = 0; i < corners; i++) {
      const inner = Math.hypot(lined.positions[i * 3] ?? 0, lined.positions[i * 3 + 1] ?? 0, lined.positions[i * 3 + 2] ?? 0);
      const o = (corners + i) * 3;
      const outer = Math.hypot(lined.positions[o] ?? 0, lined.positions[o + 1] ?? 0, lined.positions[o + 2] ?? 0);
      expect(outer).toBeGreaterThan(inner + THICK * 0.9);
    }
    // The same triangle, same corners (shifted to the outline copy), opposite way round.
    for (let t = 0; t < plain.indices.length; t += 3) {
      const [a, b, c] = [plain.indices[t] ?? 0, plain.indices[t + 1] ?? 0, plain.indices[t + 2] ?? 0];
      const hull = Array.from(lined.indices.slice(plain.indices.length + t, plain.indices.length + t + 3));
      expect(hull).toEqual([a + corners, c + corners, b + corners]);
    }
  });

  it('paints the outline in its own flat colour, unshaded', () => {
    const lined = bakeShapes([ball({ line: true })], LINE, THICK);
    const first = (lined.positions.length / 3 / 2) * 4;
    const [r, g, b] = linear(LINE);
    for (let i = first; i < lined.colors.length; i += 4) {
      expect(lined.colors[i]).toBeCloseTo(r ?? 0, 2);
      expect(lined.colors[i + 1]).toBeCloseTo(g ?? 0, 2);
      expect(lined.colors[i + 2]).toBeCloseTo(b ?? 0, 2);
      expect(lined.colors[i + 3]).toBe(1);
    }
  });

  it('shades the side facing the light brighter than the side facing away', () => {
    const baked = bakeShapes([ball({ color: 0xffffff })], LINE, THICK);
    let top = 0;
    let bottom = 0;
    let topY = -Infinity;
    let bottomY = Infinity;
    for (let i = 0; i < baked.positions.length / 3; i++) {
      const y = baked.positions[i * 3 + 1] ?? 0;
      const shade = baked.colors[i * 4] ?? 0;
      if (y > topY) [topY, top] = [y, shade];
      if (y < bottomY) [bottomY, bottom] = [y, shade];
    }
    expect(top).toBeGreaterThan(bottom + 0.2);
  });

  it('keeps an unlit shape exactly the colour it was given', () => {
    const baked = bakeShapes([ball({ color: 0x1c1c28, lit: false })], LINE, THICK);
    const [r, g, b] = linear(0x1c1c28);
    for (let i = 0; i < baked.colors.length; i += 4) {
      expect(baked.colors[i]).toBeCloseTo(r ?? 0, 3);
      expect(baked.colors[i + 1]).toBeCloseTo(g ?? 0, 3);
      expect(baked.colors[i + 2]).toBeCloseTo(b ?? 0, 3);
    }
  });

  it('places and stretches each shape by its own numbers', () => {
    const baked = bakeShapes([ball({ x: 3, y: -1, z: 2, sx: 0.5, sy: 2, sz: 1 })], LINE, THICK);
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < baked.positions.length; i += 3) {
      xs.push(baked.positions[i] ?? 0);
      ys.push(baked.positions[i + 1] ?? 0);
      zs.push(baked.positions[i + 2] ?? 0);
    }
    expect(Math.min(...xs)).toBeCloseTo(2.5, 1);
    expect(Math.max(...xs)).toBeCloseTo(3.5, 1);
    expect(Math.min(...ys)).toBeCloseTo(-3, 1);
    expect(Math.max(...ys)).toBeCloseTo(1, 1);
    expect(Math.min(...zs)).toBeCloseTo(1, 1);
    expect(Math.max(...zs)).toBeCloseTo(3, 1);
  });

  it('turns every triangle of a shape to face outward, so the front is what shows', () => {
    const baked = bakeShapes([ball({ sx: 1 })], LINE, THICK);
    const p = (i: number): number[] => [baked.positions[i * 3] ?? 0, baked.positions[i * 3 + 1] ?? 0, baked.positions[i * 3 + 2] ?? 0];
    let outward = 0;
    let inward = 0;
    for (let t = 0; t < baked.indices.length; t += 3) {
      const [a, b, c] = [p(baked.indices[t] ?? 0), p(baked.indices[t + 1] ?? 0), p(baked.indices[t + 2] ?? 0)] as [number[], number[], number[]];
      const u = [(b[0] ?? 0) - (a[0] ?? 0), (b[1] ?? 0) - (a[1] ?? 0), (b[2] ?? 0) - (a[2] ?? 0)] as [number, number, number];
      const v = [(c[0] ?? 0) - (a[0] ?? 0), (c[1] ?? 0) - (a[1] ?? 0), (c[2] ?? 0) - (a[2] ?? 0)] as [number, number, number];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] as [number, number, number];
      const dot = n[0] * ((a[0] ?? 0) + (b[0] ?? 0) + (c[0] ?? 0)) + n[1] * ((a[1] ?? 0) + (b[1] ?? 0) + (c[1] ?? 0)) + n[2] * ((a[2] ?? 0) + (b[2] ?? 0) + (c[2] ?? 0));
      if (dot > 1e-9) outward++;
      else if (dot < -1e-9) inward++;
    }
    expect(inward).toBe(0);
    expect(outward).toBeGreaterThan(100);
  });

  it('gives the same bytes every time', () => {
    const a = bakeShapes([ball({ line: true })], LINE, THICK);
    const b = bakeShapes([ball({ line: true })], LINE, THICK);
    expect(Array.from(a.colors)).toEqual(Array.from(b.colors));
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
  });
});

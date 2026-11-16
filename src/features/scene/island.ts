import type { Platform } from '../course/course';
import { createBaker, type Vec3 } from './baked';
import { checker, darken, lighten, mixColor, seeded, tileEdges } from './pattern';
import type { IslandLook } from './palette';

type Baker = ReturnType<typeof createBaker>;

const OVERHANG = 0.12;
const LIP = 0.3;
const BEVEL = 0.11;
/** How much narrower the earth is at its bottom than under the grass. */
const TAPER = 0.6;

export interface IslandOptions {
  readonly look: IslandLook & { readonly rim?: readonly [number, number] };
  /** Wanted tile size in metres: big for far-away islands, which need no detail. */
  readonly tile: number;
  /** Runs on every colour: fades far islands into the haze. */
  readonly tint?: (hex: number) => number;
  readonly seed: number;
}

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

/**
 * A floating island built from flat-coloured tiles: a chequered grass top with a lit edge, a lip that hangs over a
 * shadow line, banded earth that narrows underneath, and a dark tip. All colour is stored in the corners, so the
 * whole course is one cheap draw however many tiles it has.
 */
export function bakeIsland(baker: Baker, p: Platform, options: IslandOptions): void {
  const { look, tile, tint = (hex: number) => hex } = options;
  const rand = seeded(options.seed);
  const inside: Vec3 = { x: p.x, y: p.y - p.thickness / 2, z: p.z };
  const face = (corners: Vec3[], color: number, shades?: number[], toward: Vec3 = inside): void =>
    baker.face(corners, tint(color), shades ? { inside: toward, shades } : { inside: toward });

  const hw = p.width / 2 + OVERHANG;
  const hd = p.depth / 2 + OVERHANG;
  const top = p.y;
  const lipBottom = p.y - LIP;
  const at = (x: number, y: number, z: number): Vec3 => ({ x: p.x + x, y, z: p.z + z });

  // Grass top, one chequered tile at a time. The goal island's outer ring of tiles is gold and cream.
  const xs = tileEdges((hw - BEVEL) * 2, tile);
  const zs = tileEdges((hd - BEVEL) * 2, tile);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const onRim = i === 0 || j === 0 || i === xs.length - 2 || j === zs.length - 2;
      const color = look.rim && onRim ? look.rim[checker(i, j)] : look.top[checker(i, j)];
      const x0 = -(hw - BEVEL) + (xs[i] ?? 0);
      const x1 = -(hw - BEVEL) + (xs[i + 1] ?? 0);
      const z0 = -(hd - BEVEL) + (zs[j] ?? 0);
      const z1 = -(hd - BEVEL) + (zs[j + 1] ?? 0);
      face([at(x0, top, z0), at(x1, top, z0), at(x1, top, z1), at(x0, top, z1)], color);
    }
  }

  // A chamfer that catches the light, then the lip itself in a deeper green.
  const bevelColor = look.rim ? look.rim[0] : lighten(look.top[0], 0.2);
  const lipColor = look.rim ? darken(look.rim[0], 0.18) : look.edge;
  const inner = { x: hw - BEVEL, z: hd - BEVEL };
  const outer = { x: hw, z: hd };
  const sides: [number, number, number, number][] = [
    [-1, -1, 1, -1],
    [1, -1, 1, 1],
    [1, 1, -1, 1],
    [-1, 1, -1, -1],
  ];
  for (const [ax, az, bx, bz] of sides) {
    face(
      [at(ax * inner.x, top, az * inner.z), at(bx * inner.x, top, bz * inner.z), at(bx * outer.x, top - BEVEL, bz * outer.z), at(ax * outer.x, top - BEVEL, az * outer.z)],
      bevelColor,
    );
    face(
      [at(ax * outer.x, top - BEVEL, az * outer.z), at(bx * outer.x, top - BEVEL, bz * outer.z), at(bx * outer.x, lipBottom, bz * outer.z), at(ax * outer.x, lipBottom, az * outer.z)],
      lipColor,
      [1, 1, 0.82, 0.82],
    );
    // The underside of the overhang is in deep shade: the shadow line under the grass.
    face(
      [at(ax * outer.x, lipBottom, az * outer.z), at(bx * outer.x, lipBottom, bz * outer.z), at(bx * (p.width / 2), lipBottom, bz * (p.depth / 2)), at(ax * (p.width / 2), lipBottom, az * (p.depth / 2))],
      darken(look.earth[1], 0.5),
      undefined,
      // Looks down, so it must face away from a point above it, not from the middle of the island.
      at(0, top + 2, 0),
    );
  }

  // Earth: rows of tiles on four tapering walls. The first row sits in the lip's shadow; a few pale stones break the pattern.
  const tipY = p.y - p.thickness;
  const rows = Math.max(2, Math.round((lipBottom - tipY) / 0.5));
  const bottom = (corner: [number, number]): Vec3 => at(corner[0] * (p.width / 2) * TAPER, tipY, corner[1] * (p.depth / 2) * TAPER);
  const topCorner = (corner: [number, number]): Vec3 => at(corner[0] * (p.width / 2), lipBottom, corner[1] * (p.depth / 2));
  for (const [ax, az, bx, bz] of sides) {
    const length = Math.hypot((bx - ax) * (p.width / 2), (bz - az) * (p.depth / 2));
    const cols = tileEdges(length, tile * 0.9);
    const a: [number, number] = [ax, az];
    const b: [number, number] = [bx, bz];
    for (let c = 0; c < cols.length - 1; c++) {
      const u0 = (cols[c] ?? 0) / length;
      const u1 = (cols[c + 1] ?? 0) / length;
      for (let r = 0; r < rows; r++) {
        const v0 = r / rows;
        const v1 = (r + 1) / rows;
        const corner = (u: number, v: number): Vec3 => lerp3(lerp3(topCorner(a), topCorner(b), u), lerp3(bottom(a), bottom(b), u), v);
        let color = look.earth[checker(c, r)];
        if (r % 2 === 1) color = lighten(color, 0.05);
        if (rand() < 0.1 && r > 0) color = lighten(color, 0.22);
        if (r === 0) color = darken(color, 0.3);
        const dark = (v: number): number => 1 - 0.42 * v;
        face([corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)], color, [dark(v0), dark(v0), dark(v1), dark(v1)]);
      }
    }
  }

  // The tip: a short, dark point so the island ends in a taper, not a flat bottom.
  const apex = at(0, tipY - Math.min(1.6, 0.7 + Math.min(p.width, p.depth) * 0.16), 0);
  for (const [ax, az, bx, bz] of sides) face([bottom([ax, az]), bottom([bx, bz]), apex], look.deep, [0.8, 0.8, 0.5]);
}

/** Colour tint toward the haze for far scenery. */
export const hazeTint = (haze: number, share: number) => (hex: number): number => mixColor(hex, haze, share);

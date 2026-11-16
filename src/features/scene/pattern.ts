import type { Course } from '../course/course';

/** Pure layout and colour maths for the scenery. Nothing here draws, so it can be tested without a browser. */

const channel = (hex: number, shift: number): number => (hex >> shift) & 255;

export function mixColor(a: number, b: number, t: number): number {
  const part = (shift: number): number => Math.round(channel(a, shift) + (channel(b, shift) - channel(a, shift)) * t);
  return (part(16) << 16) | (part(8) << 8) | part(0);
}

export const lighten = (hex: number, t: number): number => mixColor(hex, 0xffffff, t);
export const darken = (hex: number, t: number): number => mixColor(hex, 0x000000, t);

/** Cut points for a length split into equal tiles near `target` wide. Vertex colours are flat per tile, so tiles are separate quads. */
export function tileEdges(length: number, target: number): number[] {
  const count = Math.max(1, Math.round(length / target));
  return Array.from({ length: count + 1 }, (_, i) => (i === count ? length : (i / count) * length));
}

export const checker = (i: number, j: number): 0 | 1 => ((((i + j) % 2) + 2) % 2) as 0 | 1;

/** A small fixed-seed generator (mulberry32): the scene must look the same on every run. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Point2 {
  readonly x: number;
  readonly z: number;
}

/** Distance from a point on the ground to the nearest part of a line through several points. */
export function pathDistance(line: readonly Point2[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const along = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - (a.x + dx * along), z - (a.z + dz * along)));
  }
  return best;
}

export type PropKind = 'tree' | 'bush' | 'flower' | 'tuft' | 'rock';

export interface Prop {
  readonly kind: PropKind;
  /** Index into the course's platforms. */
  readonly platform: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Footprint on the ground. */
  readonly radius: number;
  /** A multiplier near 1 so no two look the same. */
  readonly size: number;
  /** 0 to 1: picks a colour from the kind's short list. */
  readonly tone: number;
}

const RADIUS: Record<PropKind, number> = { tree: 0.55, bush: 0.42, rock: 0.32, flower: 0.12, tuft: 0.15 };

/** Scenery for the platforms. It is drawn only: the player's feet and the physics never see it, so it keeps off the route. */
export function layoutProps(course: Course): Prop[] {
  const route: Point2[] = [course.start, ...course.platforms, course.flag];
  const props: Prop[] = [];
  course.platforms.forEach((p, index) => {
    const rand = seeded(101 + index * 17);
    const small = Math.min(p.width, p.depth);
    const area = p.width * p.depth;
    const wanted: PropKind[] = [
      ...Array<PropKind>(small >= 6 ? 2 : small >= 4.5 ? 1 : 0).fill('tree'),
      ...Array<PropKind>(small >= 4 ? 1 + (small >= 6 ? 1 : 0) : 0).fill('bush'),
      ...Array<PropKind>(small >= 4 ? 1 : 0).fill('rock'),
      ...Array<PropKind>(Math.min(5, Math.max(1, Math.round(area / 9)))).fill('flower'),
      ...Array<PropKind>(Math.min(6, Math.max(2, Math.round(area / 6)))).fill('tuft'),
    ];
    const placed: Prop[] = [];
    for (const kind of wanted) {
      const radius = RADIUS[kind];
      for (let attempt = 0; attempt < 40; attempt++) {
        const reachX = p.width / 2 - (0.2 + radius);
        const reachZ = p.depth / 2 - (0.2 + radius);
        if (reachX <= 0 || reachZ <= 0) break;
        const x = p.x + (rand() * 2 - 1) * reachX;
        const z = p.z + (rand() * 2 - 1) * reachZ;
        const clearOfRoute = pathDistance(route, x, z) >= 0.9 + radius;
        const clearOfFlag = Math.hypot(x - course.flag.x, z - course.flag.z) > 2.2 + radius;
        const clearOfOthers = placed.every((o) => Math.hypot(x - o.x, z - o.z) >= o.radius + radius + 0.1);
        const size = 0.85 + rand() * 0.35;
        const tone = rand();
        if (clearOfRoute && clearOfFlag && clearOfOthers) {
          placed.push({ kind, platform: index, x, y: p.y, z, radius, size, tone });
          break;
        }
      }
    }
    props.push(...placed);
  });
  return props;
}

export interface CloudPuff {
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  readonly size: number;
}

export interface CloudSpec {
  /** `floor` is the sea of cloud far below the course; `side` is the scattered cloud beside it. */
  readonly layer: 'floor' | 'side';
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Half the width, and the height above `y`, of the whole cluster. */
  readonly width: number;
  readonly height: number;
  readonly puffs: readonly CloudPuff[];
}

// Puffs are drawn squashed: wider than tall, with the bottom pushed flat.
export const PUFF_STRETCH_X = 1.35;
export const PUFF_STRETCH_Y = 0.62;

function cluster(rand: () => number, layer: CloudSpec['layer'], x: number, y: number, z: number, base: number, count: number): CloudSpec {
  const puffs: CloudPuff[] = [];
  const middle = (count - 1) / 2;
  for (let k = 0; k < count; k++) {
    const off = k - middle;
    const size = base * (1 - Math.abs(off) * 0.17) * (0.9 + rand() * 0.25);
    puffs.push({ dx: off * base * 1.15, dy: (1 - Math.abs(off) / (middle + 1)) * base * 0.22, dz: (rand() - 0.5) * base * 0.7, size });
  }
  return {
    layer,
    x,
    y,
    z,
    width: Math.max(...puffs.map((p) => Math.abs(p.dx) + p.size * PUFF_STRETCH_X)),
    height: Math.max(...puffs.map((p) => p.dy + p.size * PUFF_STRETCH_Y)),
    puffs,
  };
}

/** Where the clouds go: a sea far below the course, and a few clusters beside it, well clear of the playing lane. */
export function layoutClouds(course: Course): CloudSpec[] {
  const rand = seeded(4242);
  const clouds: CloudSpec[] = [];
  const near = course.start.z + 14;
  const far = course.flag.z - 40;
  const floorCount = 9;
  for (let i = 0; i < floorCount; i++) {
    const along = i / (floorCount - 1);
    const x = ((i * 7) % 5 - 2) * 11 + (rand() - 0.5) * 8;
    const base = 2.2 + rand() * 1.6;
    const made = cluster(rand, 'floor', x, 0, near + (far - near) * along, base, 3 + Math.floor(rand() * 2));
    // The top of every puff stays under the height where a fall resets, so the hero never reaches it.
    clouds.push({ ...made, y: course.fall_y - 1.2 - made.height - rand() * 2.4 });
  }
  const sideCount = 6;
  for (let i = 0; i < sideCount; i++) {
    const along = i / (sideCount - 1);
    const side = i % 2 === 0 ? -1 : 1;
    const base = 1.2 + rand() * 1.5;
    const count = 2 + Math.floor(rand() * 4);
    const x = side * (17 + rand() * 12);
    const y = -3 + rand() * 9;
    clouds.push(cluster(rand, 'side', x, y, near + (far + 12 - near) * along, base, count));
  }
  return clouds;
}

/** How far the flag's cloth sways sideways, at `u` of the way from the pole (0) to the free end (1), at `seconds`. */
export const clothWave = (u: number, seconds: number): number => 0.2 * u * u * Math.sin(u * 4.2 - seconds * 3.4);

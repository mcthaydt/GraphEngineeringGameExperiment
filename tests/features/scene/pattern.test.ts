import { describe, expect, it } from 'vitest';
import { loadFirstCourse } from '../../../src/features/course/course';
import {
  checker,
  clothWave,
  darken,
  layoutClouds,
  layoutProps,
  lighten,
  mixColor,
  pathDistance,
  seeded,
  tileEdges,
} from '../../../src/features/scene/pattern';

const course = loadFirstCourse();

describe('colour mixing', () => {
  it('returns the ends and the middle', () => {
    expect(mixColor(0x102030, 0xf0e0d0, 0)).toBe(0x102030);
    expect(mixColor(0x102030, 0xf0e0d0, 1)).toBe(0xf0e0d0);
    expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
  });

  it('lightens toward white and darkens toward black', () => {
    expect(lighten(0x336699, 0)).toBe(0x336699);
    expect(lighten(0x336699, 1)).toBe(0xffffff);
    expect(darken(0x336699, 1)).toBe(0x000000);
    const total = (c: number): number => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
    expect(total(lighten(0x336699, 0.2))).toBeGreaterThan(total(0x336699));
    expect(total(darken(0x336699, 0.2))).toBeLessThan(total(0x336699));
  });
});

describe('tiles', () => {
  it('splits a length into whole, equal tiles close to the wanted size', () => {
    const edges = tileEdges(7.24, 1);
    expect(edges[0]).toBe(0);
    expect(edges.at(-1)).toBeCloseTo(7.24);
    expect(edges.length).toBe(8);
    const sizes = edges.slice(1).map((e, i) => e - (edges[i] ?? 0));
    for (const size of sizes) expect(size).toBeCloseTo(sizes[0] ?? 0);
    expect(sizes[0]).toBeGreaterThan(0.9);
    expect(sizes[0]).toBeLessThan(1.1);
  });

  it('never makes zero tiles', () => {
    expect(tileEdges(0.2, 1)).toEqual([0, 0.2]);
  });

  it('alternates like a chequerboard, including below zero', () => {
    expect(checker(0, 0)).toBe(0);
    expect(checker(1, 0)).toBe(1);
    expect(checker(1, 1)).toBe(0);
    expect(checker(-1, 0)).toBe(1);
    expect(checker(-1, -1)).toBe(0);
  });
});

describe('seeded numbers', () => {
  it('repeat exactly for the same seed and differ for another', () => {
    const a = seeded(7);
    const b = seeded(7);
    const c = seeded(8);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('props on the platforms', () => {
  const props = layoutProps(course);
  const route = [course.start, ...course.platforms, course.flag];

  it('is the same every time', () => {
    expect(layoutProps(course)).toEqual(props);
  });

  it('gives the course trees, flowers and rocks', () => {
    expect(props.length).toBeGreaterThanOrEqual(15);
    expect(props.filter((p) => p.kind === 'tree').length).toBeGreaterThanOrEqual(3);
    expect(new Set(props.map((p) => p.kind)).size).toBeGreaterThanOrEqual(4);
  });

  it('keeps every prop on its platform, away from the edge', () => {
    for (const prop of props) {
      const p = course.platforms[prop.platform];
      expect(p, 'platform exists').toBeDefined();
      if (!p) continue;
      expect(Math.abs(prop.x - p.x)).toBeLessThanOrEqual(p.width / 2 - 0.25);
      expect(Math.abs(prop.z - p.z)).toBeLessThanOrEqual(p.depth / 2 - 0.25);
      expect(prop.y).toBe(p.y);
    }
  });

  it('stays off the jump path so it never looks like a thing to dodge', () => {
    for (const prop of props) {
      const away = pathDistance(route, prop.x, prop.z);
      expect(away, `${prop.kind} at ${prop.x},${prop.z}`).toBeGreaterThanOrEqual(0.9 + prop.radius);
    }
  });

  it('keeps the flag clear', () => {
    for (const prop of props) expect(Math.hypot(prop.x - course.flag.x, prop.z - course.flag.z)).toBeGreaterThan(2.2);
  });

  it('never lets two props overlap', () => {
    props.forEach((a, i) =>
      props.slice(i + 1).forEach((b) => {
        if (a.platform !== b.platform) return;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual((a.radius + b.radius) * 0.9);
      }),
    );
  });
});

describe('distance to the jump path', () => {
  it('measures to the nearest part of the line, ends included', () => {
    const line = [{ x: 0, z: 0 }, { x: 0, z: -10 }];
    expect(pathDistance(line, 3, -5)).toBeCloseTo(3);
    expect(pathDistance(line, 0, 4)).toBeCloseTo(4);
    expect(pathDistance(line, -3, -14)).toBeCloseTo(5);
  });
});

describe('cloud layout', () => {
  const clouds = layoutClouds(course);

  it('is the same every time', () => {
    expect(layoutClouds(course)).toEqual(clouds);
  });

  it('has a floor of clouds far below that a fall never reaches', () => {
    const floor = clouds.filter((c) => c.layer === 'floor');
    expect(floor.length).toBeGreaterThanOrEqual(8);
    for (const cloud of floor) expect(cloud.y + cloud.height).toBeLessThan(course.fall_y - 0.5);
  });

  it('keeps the near clouds out of the playing lane', () => {
    for (const cloud of clouds.filter((c) => c.layer === 'side')) expect(Math.abs(cloud.x) - cloud.width).toBeGreaterThan(8);
  });

  it('varies size and puff count instead of repeating one recipe', () => {
    expect(new Set(clouds.map((c) => c.puffs.length)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(clouds.map((c) => c.width.toFixed(1))).size).toBeGreaterThanOrEqual(6);
    for (const cloud of clouds) {
      expect(cloud.puffs.length).toBeGreaterThanOrEqual(2);
      expect(cloud.puffs.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('flag cloth wave', () => {
  it('stays fixed at the pole and moves more toward the free end', () => {
    expect(clothWave(0, 1.3)).toBeCloseTo(0);
    const reach = (u: number): number => Math.max(...Array.from({ length: 80 }, (_, i) => Math.abs(clothWave(u, i * 0.1))));
    expect(reach(1)).toBeGreaterThan(reach(0.5));
    expect(reach(1)).toBeLessThan(0.4);
  });

  it('travels over time', () => {
    expect(clothWave(0.8, 0)).not.toBeCloseTo(clothWave(0.8, 0.4));
  });
});

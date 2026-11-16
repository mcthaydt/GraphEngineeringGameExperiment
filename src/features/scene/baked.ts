import { FlatMaterial, Geometry3D, getAttributeData, Mesh3D, srgbToLinear } from '@pixi/3d';

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Where the sunlight comes from, shared by the baked scenery and the real light on the moving things. */
export const SUN_FROM: Vec3 = { x: -6, y: 12, z: 5 };

// Light is worked out once per corner and stored as its colour. Drawing lit surfaces pixel by pixel is too slow
// on machines with no graphics card (measured: 37 ms a frame lit, under 16.7 ms unlit), and this looks the same
// for scenery that never moves.
const SUN = { r: 0.56, g: 0.53, b: 0.46 };
const SKY = { r: 0.5, g: 0.55, b: 0.64 };
const GROUND = { r: 0.36, g: 0.33, b: 0.36 };
const sunLength = Math.hypot(SUN_FROM.x, SUN_FROM.y, SUN_FROM.z);
const TO_SUN: Vec3 = { x: SUN_FROM.x / sunLength, y: SUN_FROM.y / sunLength, z: SUN_FROM.z / sunLength };

export interface BakeOptions {
  readonly position?: Vec3;
  readonly scale?: Vec3 | number;
  /** Turn around the up axis, in radians. */
  readonly yaw?: number;
  /** A colour, or a function of the corner's place on the unscaled shape and its normal. */
  readonly color: number | ((local: Vec3, normal: Vec3) => number);
  /** False keeps the colour exactly as given: for the sky and anything that glows. */
  readonly lit?: boolean;
  /** Darkens toward the bottom of the shape by this share, like dirt in shade. 0 is off. */
  readonly fade?: number;
}

/** The colour a surface facing `normal` shows once its lighting is stored in it. `null` keeps the colour as given. */
function lightColor(hex: number, normal: Vec3, depth: number | null): [number, number, number] {
  const r = srgbToLinear(((hex >> 16) & 255) / 255);
  const g = srgbToLinear(((hex >> 8) & 255) / 255);
  const b = srgbToLinear((hex & 255) / 255);
  if (depth === null) return [Math.min(1, r), Math.min(1, g), Math.min(1, b)];
  const sun = Math.max(0, normal.x * TO_SUN.x + normal.y * TO_SUN.y + normal.z * TO_SUN.z);
  const up = normal.y * 0.5 + 0.5;
  return [
    Math.min(1, r * (GROUND.r + (SKY.r - GROUND.r) * up + SUN.r * sun) * depth),
    Math.min(1, g * (GROUND.g + (SKY.g - GROUND.g) * up + SUN.g * sun) * depth),
    Math.min(1, b * (GROUND.b + (SKY.b - GROUND.b) * up + SUN.b * sun) * depth),
  ];
}

export interface FaceOptions {
  /** False keeps the colour exactly as given. */
  readonly lit?: boolean;
  /** A point inside the shape the face belongs to: the face is turned to look away from it. */
  readonly inside: Vec3;
  /** Brightness at each corner, 0 to 1: a soft fall-off such as a contact shadow. */
  readonly shades?: readonly number[];
}

/** Collects many shapes into one mesh with the lighting stored in its colours: one cheap draw for a whole layer. */
export function createBaker() {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  return {
    add(geometry: Geometry3D, options: BakeOptions): void {
      const source = getAttributeData(geometry, 'aPosition', 3);
      const normals = getAttributeData(geometry, 'aNormal', 3);
      const { position = { x: 0, y: 0, z: 0 }, yaw = 0, lit = true, fade = 0 } = options;
      const scale = typeof options.scale === 'number' ? { x: options.scale, y: options.scale, z: options.scale } : (options.scale ?? { x: 1, y: 1, z: 1 });
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const base = positions.length / 3;
      let low = Infinity;
      let high = -Infinity;
      for (let i = 1; i < source.length; i += 3) {
        low = Math.min(low, source[i] ?? 0);
        high = Math.max(high, source[i] ?? 0);
      }

      for (let i = 0; i < source.length; i += 3) {
        const local = { x: source[i] ?? 0, y: source[i + 1] ?? 0, z: source[i + 2] ?? 0 };
        const sx = local.x * scale.x;
        const sz = local.z * scale.z;
        positions.push(position.x + sx * cos + sz * sin, position.y + local.y * scale.y, position.z - sx * sin + sz * cos);

        // A stretched shape tilts its normals the other way, so divide by the scale.
        const nx0 = (normals[i] ?? 0) / scale.x;
        const ny0 = (normals[i + 1] ?? 1) / scale.y;
        const nz0 = (normals[i + 2] ?? 0) / scale.z;
        const length = Math.hypot(nx0, ny0, nz0) || 1;
        const normal = { x: (nx0 * cos + nz0 * sin) / length, y: ny0 / length, z: (-nx0 * sin + nz0 * cos) / length };

        const hex = typeof options.color === 'number' ? options.color : options.color(local, normal);
        const depth = 1 - fade * (1 - (local.y - low) / Math.max(1e-6, high - low));
        const [r, g, b] = lightColor(hex, normal, lit ? depth : null);
        colors.push(r, g, b, 1);
      }
      for (const index of geometry.indices) indices.push(base + index);
    },
    /** One flat-coloured face from three or four corners in any order around it. */
    face(corners: readonly Vec3[], color: number, options: FaceOptions): void {
      const [a, b, c] = corners;
      if (!a || !b || !c || corners.length < 3) return;
      const ux = b.x - a.x;
      const uy = b.y - a.y;
      const uz = b.z - a.z;
      const vx = c.x - a.x;
      const vy = c.y - a.y;
      const vz = c.z - a.z;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz) || 1;
      nx /= length;
      ny /= length;
      nz /= length;
      const mid = {
        x: corners.reduce((sum, p) => sum + p.x, 0) / corners.length,
        y: corners.reduce((sum, p) => sum + p.y, 0) / corners.length,
        z: corners.reduce((sum, p) => sum + p.z, 0) / corners.length,
      };
      const flip = nx * (mid.x - options.inside.x) + ny * (mid.y - options.inside.y) + nz * (mid.z - options.inside.z) < 0;
      if (flip) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const base = positions.length / 3;
      corners.forEach((p, i) => {
        positions.push(p.x, p.y, p.z);
        const [r, g, bl] = lightColor(color, { x: nx, y: ny, z: nz }, options.lit === false ? null : (options.shades?.[i] ?? 1));
        colors.push(r, g, bl, 1);
      });
      for (let i = 1; i < corners.length - 1; i++) indices.push(...(flip ? [base, base + i + 1, base + i] : [base, base + i, base + i + 1]));
    },
    build(label: string): Mesh3D {
      return new Mesh3D({
        label,
        geometry: new Geometry3D({
          positions: new Float32Array(positions),
          colors: new Float32Array(colors),
          indices: new Uint32Array(indices),
        }),
        material: new FlatMaterial({ baseColor: 0xffffff, vertexColors: true }),
        castShadow: false,
        receiveShadow: false,
      });
    },
  };
}

export interface Shape {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sx: number;
  readonly sy?: number;
  readonly sz?: number;
  readonly color: number;
  /** Draws a dark line round the shape. */
  readonly line?: boolean;
  /** False keeps the colour as given, for eyes and sparkles that should not be shaded. */
  readonly lit?: boolean;
}

export interface Baked {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly indices: Uint32Array;
}

// The hero is drawn as a few merged meshes with the light stored in their corner colours, because every separate
// shape costs a draw call and every lit pixel costs real time on machines with no graphics card. The light is fixed
// in the hero's own frame, as the sun falls on it seen from behind, which is how the game mostly shows it.
const TO_SUN = normalise(6, 12, -5);
const SUN = { r: 0.62, g: 0.58, b: 0.5 };
const SKY = { r: 0.55, g: 0.6, b: 0.7 };
const GROUND = { r: 0.4, g: 0.36, b: 0.38 };

function normalise(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

const linear = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const channel = (hex: number, shift: number): number => linear(((hex >> shift) & 255) / 255);

/** Big shapes get more corners than small ones: a hand does not need to be as round as a body. */
function detail(size: number): { across: number; down: number } {
  return size > 0.2 ? { across: 16, down: 11 } : { across: 9, down: 6 };
}

/**
 * Merges ball shapes into one mesh. A shape with `line` also gets a bigger copy, drawn after it, with its triangles
 * turned inside out: with the usual back-face culling only the far side of that copy shows, as a dark line round
 * the silhouette, in the same mesh and the same draw call.
 */
export function bakeShapes(shapes: readonly Shape[], outline: number, thickness: number): Baked {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const lines: Shape[] = [];

  const add = (shape: Shape, grow: number, flip: boolean, flat: number | null): void => {
    const sx = shape.sx + grow;
    const sy = (shape.sy ?? shape.sx) + grow;
    const sz = (shape.sz ?? shape.sx) + grow;
    const { across, down } = detail(Math.max(shape.sx, shape.sy ?? 0, shape.sz ?? 0));
    const base = positions.length / 3;
    for (let i = 0; i <= down; i++) {
      const theta = (i / down) * Math.PI;
      for (let j = 0; j <= across; j++) {
        const phi = (j / across) * Math.PI * 2;
        const nx = Math.sin(theta) * Math.cos(phi);
        const ny = Math.cos(theta);
        const nz = Math.sin(theta) * Math.sin(phi);
        positions.push(shape.x + nx * sx, shape.y + ny * sy, shape.z + nz * sz);
        let r: number;
        let g: number;
        let b: number;
        if (flat !== null) {
          [r, g, b] = [channel(flat, 16), channel(flat, 8), channel(flat, 0)];
        } else if (shape.lit === false) {
          [r, g, b] = [channel(shape.color, 16), channel(shape.color, 8), channel(shape.color, 0)];
        } else {
          // A stretched ball tilts its normals the other way, so divide by the stretch.
          const n = normalise(nx / sx, ny / sy, nz / sz);
          const sun = Math.max(0, n.x * TO_SUN.x + n.y * TO_SUN.y + n.z * TO_SUN.z);
          const up = n.y * 0.5 + 0.5;
          r = channel(shape.color, 16) * (GROUND.r + (SKY.r - GROUND.r) * up + SUN.r * sun);
          g = channel(shape.color, 8) * (GROUND.g + (SKY.g - GROUND.g) * up + SUN.g * sun);
          b = channel(shape.color, 0) * (GROUND.b + (SKY.b - GROUND.b) * up + SUN.b * sun);
        }
        colors.push(Math.min(1, r), Math.min(1, g), Math.min(1, b), 1);
      }
    }
    for (let i = 0; i < down; i++) {
      for (let j = 0; j < across; j++) {
        const a = base + i * (across + 1) + j;
        const b = a + across + 1;
        const c = a + 1;
        const d = b + 1;
        if (flip) indices.push(a, b, c, c, b, d);
        else indices.push(a, c, b, c, d, b);
      }
    }
  };

  for (const shape of shapes) {
    add(shape, 0, false, null);
    if (shape.line) lines.push(shape);
  }
  for (const shape of lines) add(shape, thickness, true, outline);

  return { positions: new Float32Array(positions), colors: new Float32Array(colors), indices: new Uint32Array(indices) };
}

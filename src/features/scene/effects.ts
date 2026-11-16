import { Container3D, ParticleContainer3D } from '@pixi/3d';
import { Rectangle, Texture } from 'pixi.js';
import {
  arrivalBurst,
  bitLook,
  cheerSparkles,
  confettiBurst,
  FRAME,
  landingDust,
  shadowLook,
  stepBit,
  takeoffDust,
  vanishBurst,
  type Bit,
} from './motion';
import { PALETTE } from './palette';

export interface Effects {
  readonly node: Container3D;
  /** The soft round shadow under the player: the main cue for where a jump will land. */
  shadow(x: number, z: number, groundY: number | null, height: number): void;
  takeoff(x: number, y: number, z: number): void;
  land(x: number, y: number, z: number, speed: number): void;
  confetti(x: number, y: number, z: number): void;
  /** The hero is back at the start after a fall. */
  arrive(x: number, y: number, z: number): void;
  /** The hero has dropped out of sight. */
  vanish(x: number, y: number, z: number): void;
  sparkle(x: number, y: number, z: number): void;
  update(dt: number): void;
}

const CELL = 128;
const FRAMES = 6;

/** One small picture sheet drawn by code, so every effect shares a texture and draws in one call per layer. */
function drawSheet(): Texture[] {
  const canvas = document.createElement('canvas');
  canvas.width = CELL * FRAMES;
  canvas.height = CELL;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('no canvas');
  const half = CELL / 2;
  const cell = (frame: number): number => frame * CELL + half;

  const blob = (cx: number, cy: number, radius: number, strength: number): void => {
    const fill = g.createRadialGradient(cx, cy, 0, cx, cy, radius);
    fill.addColorStop(0, `rgba(255,255,255,${strength})`);
    fill.addColorStop(0.55, `rgba(255,255,255,${strength * 0.55})`);
    fill.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fill;
    g.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  };
  // A puff is a ring of overlapping soft blobs round a fuller middle, so it has a lumpy, round cloud outline.
  blob(cell(FRAME.puff), half, 46, 1);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    blob(cell(FRAME.puff) + Math.cos(a) * 24, half + Math.sin(a) * 24, 30, 0.95);
  }

  const ring = g.createRadialGradient(cell(FRAME.ring), half, 10, cell(FRAME.ring), half, 62);
  ring.addColorStop(0, 'rgba(255,255,255,0)');
  ring.addColorStop(0.62, 'rgba(255,255,255,0.1)');
  ring.addColorStop(0.8, 'rgba(255,255,255,0.95)');
  ring.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = ring;
  g.fillRect(FRAME.ring * CELL, 0, CELL, CELL);

  // A four-point sparkle with a glow behind it.
  blob(cell(FRAME.star), half, 52, 0.55);
  g.fillStyle = '#fff';
  g.beginPath();
  const sx = cell(FRAME.star);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 56 : 12;
    g.lineTo(sx + Math.cos(a) * r, half + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();

  // Confetti: a wide paper chip with a lighter edge, and the same chip seen edge on.
  const chip = (frame: number, width: number, height: number): void => {
    const x = cell(frame) - width / 2;
    const y = half - height / 2;
    g.fillStyle = '#fff';
    g.beginPath();
    g.roundRect(x, y, width, height, Math.min(8, height / 2));
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(x, y + height * 0.55, width, height * 0.45);
  };
  chip(FRAME.chip, 92, 58);
  chip(FRAME.chipEdge, 92, 12);

  // The shadow: a soft disc that is solid in the middle and melts away at the edge.
  const shade = g.createRadialGradient(cell(FRAME.shade), half, 0, cell(FRAME.shade), half, 62);
  shade.addColorStop(0, 'rgba(255,255,255,1)');
  shade.addColorStop(0.45, 'rgba(255,255,255,0.9)');
  shade.addColorStop(0.75, 'rgba(255,255,255,0.35)');
  shade.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = shade;
  g.fillRect(FRAME.shade * CELL, 0, CELL, CELL);

  const sheet = Texture.from(canvas);
  return Array.from({ length: FRAMES }, (_, i) => new Texture({ source: sheet.source, frame: new Rectangle(i * CELL, 0, CELL, CELL) }));
}

interface Layer {
  readonly container: ParticleContainer3D;
  readonly bits: Bit[];
  /** How many slots were written last frame, so leftovers can be emptied. */
  written: number;
  /** Slots before this one belong to something else (the shadow). */
  readonly first: number;
}

export function createEffects(): Effects {
  const node = new Container3D({ label: 'effects' });
  const frames = drawSheet();
  const layer = (billboard: 'horizontal' | 'spherical', capacity: number, first: number): Layer => {
    const container = new ParticleContainer3D({ texture: frames, capacity: capacity + first, billboard, blendMode: 'normal' });
    node.addChild(container);
    return { container, bits: [], written: 0, first };
  };
  // Drawn in this order: things lying on the ground, then puffs and sparkles, then paper on top.
  const ground = layer('horizontal', 8, 1);
  const fluff = layer('spherical', 48, 0);
  const paper = layer('spherical', 96, 0);
  const layers: Record<Bit['kind'], Layer> = { ring: ground, puff: fluff, star: fluff, confetti: paper };
  const capacityOf = (l: Layer): number => l.container.capacity - l.first;

  const add = (bits: Bit[]): void => {
    for (const b of bits) {
      const l = layers[b.kind];
      l.bits.push(b);
      // When a layer is full the oldest bit makes room.
      if (l.bits.length > capacityOf(l)) l.bits.shift();
    }
  };

  function draw(l: Layer): void {
    let slot = l.first;
    for (const b of l.bits) {
      const look = bitLook(b);
      l.container.setParticleAt(slot++, b.x, b.y, b.z, look.size, look.rotation, look.color, look.alpha, look.frame);
    }
    for (let i = slot; i < l.written; i++) l.container.setParticleAt(i, 0, 0, 0, 0);
    // The ground layer also holds the shadow, which changes every frame.
    if (l.first > 0 || slot !== l.written || l.bits.length > 0) l.container.upload();
    l.written = slot;
  }

  return {
    node,
    shadow(x, z, groundY, height) {
      if (groundY === null) {
        ground.container.setParticleAt(0, 0, 0, 0, 0);
      } else {
        const look = shadowLook(height);
        ground.container.setParticleAt(0, x, groundY + 0.04, z, 1.55 * look.scale, 0, PALETTE.shadow, look.alpha, FRAME.shade);
      }
    },
    takeoff: (x, y, z) => add(takeoffDust(x, y, z)),
    land: (x, y, z, speed) => add(landingDust(x, y, z, speed)),
    confetti: (x, y, z) => add(confettiBurst(x, y, z)),
    arrive: (x, y, z) => add(arrivalBurst(x, y, z)),
    vanish: (x, y, z) => add(vanishBurst(x, y, z)),
    sparkle: (x, y, z) => add(cheerSparkles(x, y, z)),
    update(dt) {
      for (const l of [ground, fluff, paper]) {
        for (let i = l.bits.length - 1; i >= 0; i--) if (!stepBit(l.bits[i] as Bit, dt)) l.bits.splice(i, 1);
        draw(l);
      }
    },
  };
}

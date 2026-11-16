import { Container3D, CubeGeometry, CylinderGeometry, FlatMaterial, Mesh3D, SphereGeometry } from '@pixi/3d';
import { clamp } from '../../lib/maths';
import { must } from '../../lib/must';
import { CONFETTI, PALETTE } from './palette';

interface Bit {
  readonly mesh: Mesh3D;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  age: number;
  life: number;
  size: number;
  gravity: number;
}

export interface Effects {
  readonly node: Container3D;
  /** The round shadow under the player: the main cue for where a jump will land. */
  shadow(x: number, z: number, groundY: number | null, height: number): void;
  dust(x: number, y: number, z: number, amount: number): void;
  confetti(x: number, y: number, z: number): void;
  update(dt: number): void;
}

export function createEffects(): Effects {
  const node = new Container3D({ label: 'effects' });
  const blob = new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.5, radiusBottom: 0.5, height: 0.02, radialSegments: 24 }),
    material: new FlatMaterial({ baseColor: PALETTE.shadow, alphaMode: 'blend', alpha: 0.4 }),
    castShadow: false,
    receiveShadow: false,
  });
  node.addChild(blob);

  const puff = new SphereGeometry({ radius: 1, widthSegments: 8, heightSegments: 6 });
  const dustMaterial = new FlatMaterial({ baseColor: PALETTE.dust });
  const chip = new CubeGeometry({ width: 1, height: 1, depth: 0.2 });
  const confettiMaterials = CONFETTI.map((baseColor) => new FlatMaterial({ baseColor }));
  const live: Bit[] = [];
  const spare: Record<'dust' | 'confetti', Mesh3D[]> = { dust: [], confetti: [] };

  function spawn(kind: 'dust' | 'confetti', index: number, at: { x: number; y: number; z: number }, bit: Omit<Bit, 'mesh' | 'age'>): void {
    const mesh =
      spare[kind].pop() ??
      new Mesh3D({
        geometry: kind === 'dust' ? puff : chip,
        material: kind === 'dust' ? dustMaterial : must(confettiMaterials[index % confettiMaterials.length]),
        castShadow: false,
        receiveShadow: false,
      });
    mesh.label = kind;
    mesh.visible = true;
    mesh.position.set(at.x, at.y, at.z);
    node.addChild(mesh);
    live.push({ mesh, age: 0, ...bit });
  }

  return {
    node,
    shadow(x, z, groundY, height) {
      blob.visible = groundY !== null;
      if (groundY === null) return;
      // Smaller and fainter the higher the player is, like a real shadow.
      const size = clamp(1 - height * 0.12, 0.45, 1);
      blob.position.set(x, groundY + 0.03, z);
      blob.scale.set(size, 1, size);
    },
    dust(x, y, z, amount) {
      const count = Math.round(clamp(amount, 3, 8));
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + 0.4;
        spawn('dust', i, { x: x + Math.cos(angle) * 0.25, y: y + 0.08, z: z + Math.sin(angle) * 0.25 }, {
          vx: Math.cos(angle) * 2.2,
          vy: 0.9,
          vz: Math.sin(angle) * 2.2,
          spin: 0,
          life: 0.35,
          size: 0.16,
          gravity: 0,
        });
      }
    },
    confetti(x, y, z) {
      for (let i = 0; i < 48; i++) {
        // A fixed spread, not random, so a replay looks the same.
        const angle = i * 2.399;
        const out = 1.5 + (i % 5) * 0.7;
        spawn('confetti', i, { x, y: y + 1.2, z }, {
          vx: Math.cos(angle) * out,
          vy: 6 + (i % 7) * 0.8,
          vz: Math.sin(angle) * out,
          spin: 6 + (i % 4) * 3,
          life: 2.2,
          size: 0.16,
          gravity: 9,
        });
      }
    },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const bit = must(live[i]);
        bit.age += dt;
        if (bit.age >= bit.life) {
          bit.mesh.visible = false;
          node.removeChild(bit.mesh);
          spare[bit.mesh.label === 'dust' ? 'dust' : 'confetti'].push(bit.mesh);
          live.splice(i, 1);
          continue;
        }
        bit.vy -= bit.gravity * dt;
        bit.mesh.position.set(bit.mesh.position.x + bit.vx * dt, bit.mesh.position.y + bit.vy * dt, bit.mesh.position.z + bit.vz * dt);
        bit.mesh.rotation.set(bit.age * bit.spin, bit.age * bit.spin * 0.7, 0);
        const fade = 1 - bit.age / bit.life;
        const size = bit.size * (bit.gravity === 0 ? 0.6 + fade : Math.min(1, fade * 4));
        bit.mesh.scale.set(size, size, size);
      }
    },
  };
}

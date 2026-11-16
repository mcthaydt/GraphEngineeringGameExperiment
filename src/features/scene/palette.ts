/** Every colour in the 3D scene, in one place so the look stays consistent. */
export const PALETTE = {
  cloud: 0xffffff,
  cloudMid: 0xe9f3ff,
  cloudShade: 0xc4dcf5,
  sun: 0xfff3dc,
  grass: 0x74d44c,
  grassEdge: 0x57b93a,
  dirt: 0xd09050,
  dirtDark: 0x9c6435,
  hero: 0xff7a2f,
  heroDark: 0x5a3320,
  heroBelly: 0xffe3c2,
  eye: 0xffffff,
  pupil: 0x1c1c28,
  pole: 0xf6f6f6,
  flag: 0xf2364a,
  gold: 0xffc93c,
  dust: 0xffffff,
  shadow: 0x10202c,
} as const;

/** The sky is painted in CSS behind the see-through canvas: top, eye level, far below. */
/** How one island's surfaces are coloured: two tiles of grass, the lip, two bands of earth and the dark tip. */
export interface IslandLook {
  readonly top: readonly [number, number];
  readonly edge: number;
  readonly earth: readonly [number, number];
  readonly deep: number;
}

/** Fresh at the start, warmer in the middle, cooler toward the end, so each stretch of the course feels different. */
export const LOOKS: readonly IslandLook[] = [
  { top: [0x7cdc4f, 0x68c640], edge: 0x4aa838, earth: [0xd7a062, 0xc68c4c], deep: 0x8d5a34 },
  { top: [0xa9de4d, 0x94ca3f], edge: 0x6fa732, earth: [0xdb9a52, 0xc9853f], deep: 0x95562b },
  { top: [0x57d08a, 0x46bc76], edge: 0x329f64, earth: [0xc99a74, 0xb78760], deep: 0x7b5642 },
];

/** The last island: the same grass with a gold and cream trim, so the destination looks special. */
export const GOAL_LOOK = { ...LOOKS[2]!, top: [0x6edc6c, 0x5ec85d] as const, rim: [0xffcf45, 0xfff0bd] as const };

export const PROPS = {
  trunk: 0x8b5a38,
  leaves: [0x3fae58, 0x58c65c, 0x2f9c68] as const,
  leavesWarm: 0xf4a53a,
  flowers: [0xff6f9f, 0xffd53d, 0xffffff, 0xff9a3c, 0xb58cff] as const,
  stalk: 0x3f9c3a,
  tuft: 0x4cae3c,
  rock: 0xb9b2a8,
} as const;

/** Far-away shapes fade toward this, like distant land seen through haze. */
export const HAZE = 0xcfe6f4;

export const SKY_CSS = 'linear-gradient(#3f9bf0, #bfe3fb 45%, #e6f3fd)';

export const CONFETTI = [0xf2364a, 0xffc93c, 0x3fb8ff, 0x74d44c, 0xff7a2f, 0xb56bff] as const;

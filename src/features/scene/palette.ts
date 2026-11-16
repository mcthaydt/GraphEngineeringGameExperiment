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
  /** The second colour: a cap, a backpack and boots in deep violet, which no grass, earth or sky is close to. */
  heroViolet: 0x5a3fd6,
  heroBoot: 0x3b2a96,
  heroOutline: 0x2a1950,
  heroBelly: 0xffe3c2,
  cream: 0xfff0d6,
  blush: 0xff9aa8,
  eye: 0xffffff,
  pupil: 0x1c1c28,
  pole: 0xf6f6f6,
  flag: 0xf2364a,
  gold: 0xffc93c,
  /** A pale warm grey: pure white blows out against the sky. */
  dust: 0xf1e6d2,
  dustRing: 0xfff4de,
  starGold: 0xffd44a,
  /** A dark green, so the shadow blends into the grass instead of sitting on it like a blue-black sticker. */
  shadow: 0x17331f,
} as const;

/** The sky is painted in CSS behind the see-through canvas: top, eye level, far below. */
export const SKY_CSS = 'linear-gradient(#3f9bf0, #cdeeff 58%, #9fd0f5)';

export const CONFETTI = [0xf2364a, 0xffc93c, 0x3fb8ff, 0x74d44c, 0xff7a2f, 0xb56bff] as const;

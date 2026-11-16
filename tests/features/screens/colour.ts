export type Rgb = readonly [number, number, number];
type Rgba = readonly [number, number, number, number];

/** Reads the `rgb()` / `rgba()` / `color(srgb …)` forms a browser reports for a computed colour. */
export function parseColor(css: string): Rgba {
  const srgb = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/.exec(css.trim());
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number(srgb[4])];
  const numbers = css.match(/[\d.]+/g)?.map(Number);
  if (!numbers || numbers.length < 3) throw new Error(`Cannot read the colour ${css}`);
  return [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 1];
}

const over = (top: Rgba, below: Rgb): Rgb => [0, 1, 2].map((i) => (top[i] ?? 0) * top[3] + (below[i] ?? 0) * (1 - top[3])) as unknown as Rgb;

/** What an element's text really sits on: every ancestor's background laid over `behind`, outermost first. */
export function effectiveBackground(element: HTMLElement, behind: Rgb): Rgb {
  const chain: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node; node = node.parentElement) chain.unshift(node);
  return chain.reduce<Rgb>((below, node) => over(parseColor(getComputedStyle(node).backgroundColor), below), behind);
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast of a text colour (laid over the background first, if it is see-through) against a background. */
export function contrastRatio(text: Rgba, background: Rgb): number {
  const a = luminance(over(text, background));
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

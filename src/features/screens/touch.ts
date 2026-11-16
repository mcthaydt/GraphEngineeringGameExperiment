export interface TouchProbe {
  matches(query: string): boolean;
}

/**
 * True on a phone or tablet, where a finger is the main way to point. A laptop with a touchscreen is not one: it has
 * keys, and gets the touch controls only after a real finger touch.
 */
export const prefersTouch = (probe: TouchProbe = { matches: (query) => window.matchMedia(query).matches }): boolean =>
  probe.matches('(pointer: coarse)');

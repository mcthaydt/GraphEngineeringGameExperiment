import { describe, expect, it } from 'vitest';
import { prefersTouch } from '../../../src/features/screens/touch';

const device = (coarse: boolean, touchPoints: number) => ({
  matches: (query: string) => query === '(pointer: coarse)' && coarse,
  touchPoints,
});

describe('prefersTouch', () => {
  it('is false on a computer', () => expect(prefersTouch(device(false, 0))).toBe(false));
  it('is false on a laptop with a touchscreen, which still has keys', () => expect(prefersTouch(device(false, 10))).toBe(false));
  it('is true on a tablet', () => expect(prefersTouch(device(true, 5))).toBe(true));
  it('is true on a phone', () => expect(prefersTouch(device(true, 5))).toBe(true));
});

export type Quality = 'lite' | 'full';

export interface QualitySettings {
  readonly name: Quality;
  readonly antialias: boolean;
  /** Drawn pixels per screen pixel, given the screen's own pixel density. */
  resolution(devicePixelRatio: number): number;
}

const SETTINGS: Record<Quality, QualitySettings> = {
  // For machines that draw on the processor, where every pixel is expensive (measured: about 12 ms to fill a
  // 1280x720 screen once). Half size in each direction is a quarter of the pixels, stretched to fit.
  lite: { name: 'lite', antialias: false, resolution: () => 0.5 },
  full: { name: 'full', antialias: true, resolution: (devicePixelRatio) => Math.min(devicePixelRatio, 2) },
};

const SOFTWARE = /swiftshader|llvmpipe|software|basic render/i;

/** The name of the thing drawing WebGL, or '' when the browser hides it. */
export function rendererName(): string {
  const gl = document.createElement('canvas').getContext('webgl2');
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  const name = gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return name;
}

export const pickQuality = (choice: Quality | 'auto', renderer: string = rendererName()): QualitySettings =>
  SETTINGS[choice === 'auto' ? (SOFTWARE.test(renderer) ? 'lite' : 'full') : choice];

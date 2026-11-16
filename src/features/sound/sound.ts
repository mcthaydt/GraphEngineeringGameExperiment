import type { SimEvent } from '../sim/sim';

export interface Sound {
  play(event: SimEvent): void;
  dispose(): void;
}

export interface Blip {
  readonly from: number;
  readonly to: number;
  readonly seconds: number;
  readonly wave: OscillatorType;
  readonly gain: number;
  readonly delay?: number;
}

const WIN: readonly Blip[] = [523, 659, 784, 1047].map((hz, i) => ({
  from: hz,
  to: hz,
  seconds: i === 3 ? 0.36 : 0.12,
  wave: 'triangle',
  gain: 0.08,
  delay: i * 0.12,
}));

// A landing quieter than this is a step, not a landing.
const LAND_MIN = 3;
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * What each moment sounds like: short sweeps between two pitches (Hz), no audio files to load. Soft shapes only,
 * to match the pastel look. A jump is brighter and louder on a run, a landing louder the harder it is.
 */
export function blipsFor(event: SimEvent): readonly Blip[] {
  switch (event.type) {
    case 'jump': {
      const run = clamp01(event.speed / 7);
      return [
        {
          from: 300 + run * 40,
          to: 520 + run * 260,
          seconds: 0.14,
          wave: 'sine',
          gain: 0.07 + run * 0.04,
        },
      ];
    }
    case 'land': {
      if (event.speed < LAND_MIN) return [];
      const hard = clamp01((event.speed - LAND_MIN) / 20);
      return [
        {
          from: 150,
          to: 60,
          seconds: 0.1 + hard * 0.06,
          wave: 'sine',
          gain: 0.04 + hard * 0.12,
        },
        { from: 300, to: 120, seconds: 0.05, wave: 'triangle', gain: 0.02 + hard * 0.03 },
      ];
    }
    // The whistle plays as the hero goes over the edge; being put back at the start is silent.
    case 'drop':
      return [{ from: 520, to: 110, seconds: 0.45, wave: 'sine', gain: 0.07 }];
    case 'fall':
      return [];
    case 'win':
      return WIN;
  }
}

export function createSound(): Sound {
  let context: AudioContext | undefined;
  const wake = (): void => {
    context ??= new AudioContext();
    void context.resume();
  };
  window.addEventListener('pointerdown', wake);
  window.addEventListener('keydown', wake);

  return {
    play(event) {
      if (!context) return;
      // The very first press creates the context a moment before it is allowed to play: wait for it, don't drop the sound.
      if (context.state === 'suspended') void context.resume().then(() => schedule(event));
      else if (context.state === 'running') schedule(event);
    },
    dispose() {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      void context?.close();
    },
  };

  function schedule(event: SimEvent): void {
    if (!context) return;
    for (const blip of blipsFor(event)) {
      const start = context.currentTime + (blip.delay ?? 0);
      const end = start + blip.seconds;
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      oscillator.type = blip.wave;
      oscillator.frequency.setValueAtTime(blip.from, start);
      oscillator.frequency.exponentialRampToValueAtTime(blip.to, end);
      // A quick fade at each end: a hard start or stop is heard as a click.
      volume.gain.setValueAtTime(0, start);
      volume.gain.linearRampToValueAtTime(blip.gain, start + 0.01);
      volume.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(volume).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  }
}

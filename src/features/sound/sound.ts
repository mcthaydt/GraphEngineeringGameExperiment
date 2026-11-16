import type { SimEvent } from '../sim/sim';

export interface Sound {
  play(event: SimEvent): void;
  dispose(): void;
}

interface Blip {
  readonly from: number;
  readonly to: number;
  readonly seconds: number;
  readonly wave: OscillatorType;
  readonly gain: number;
  readonly delay?: number;
}

// Each sound is a short sweep between two pitches (Hz): no audio files to load.
const BLIPS: Record<SimEvent['type'], readonly Blip[]> = {
  jump: [{ from: 330, to: 660, seconds: 0.16, wave: 'square', gain: 0.07 }],
  land: [{ from: 160, to: 70, seconds: 0.09, wave: 'triangle', gain: 0.14 }],
  fall: [{ from: 520, to: 110, seconds: 0.45, wave: 'sawtooth', gain: 0.07 }],
  win: [
    { from: 523, to: 523, seconds: 0.12, wave: 'square', gain: 0.07 },
    { from: 659, to: 659, seconds: 0.12, wave: 'square', gain: 0.07, delay: 0.12 },
    { from: 784, to: 784, seconds: 0.12, wave: 'square', gain: 0.07, delay: 0.24 },
    { from: 1047, to: 1047, seconds: 0.36, wave: 'square', gain: 0.07, delay: 0.36 },
  ],
};

/** Browsers only allow sound after a tap or key press, so the audio context starts on the first one. */
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
      if (!context || context.state !== 'running') return;
      for (const blip of BLIPS[event.type]) {
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
    },
    dispose() {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      void context?.close();
    },
  };
}

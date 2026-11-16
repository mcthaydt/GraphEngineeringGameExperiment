import { parse } from 'smol-toml';
import { z } from 'zod';
import source from './library/game.toml?raw';

const positive = z.number().positive();

export const TuningSchema = z.strictObject({
  player: z.strictObject({
    radius: positive,
    height: positive,
    run_speed: positive,
    ground_accel: positive,
    ground_brake: positive,
    air_accel: positive,
    jump_speed: positive,
    gravity: positive,
    fall_gravity: positive,
    jump_cut: z.number().min(0).max(1),
    max_fall_speed: positive,
    coyote_ms: z.number().min(0),
    jump_buffer_ms: z.number().min(0),
  }),
  camera: z.strictObject({
    fov: positive,
    back: positive,
    up: positive,
    look_ahead: z.number(),
    look_up: z.number(),
    follow: positive,
    follow_height: positive,
  }),
  goal: z.strictObject({ reach: positive }),
});

export type Tuning = z.infer<typeof TuningSchema>;

export const parseTuning = (toml: string): Tuning => TuningSchema.parse(parse(toml));

export const loadTuning = (): Tuning => parseTuning(source);

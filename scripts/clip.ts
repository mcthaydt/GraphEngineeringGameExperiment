// Joins the frames from `npm run capture` into captures/clip.mp4. Needs ffmpeg on the PATH.
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-framerate', '30', '-i', 'captures/clip/frame-%04d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', 'captures/clip.mp4'],
  { stdio: 'inherit' },
);
if (result.error) console.error('ffmpeg is not installed, so no clip was made. The frames are in captures/clip/.');
process.exit(result.status ?? 1);

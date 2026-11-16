import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { startServer, stopServer } from '../../scripts/preview-server.ts';

// A stand-in for `npx vite preview`: a shell that starts a node server as its own child, like npx does.
const listener = (port: number): { command: string; args: string[] } => ({
  command: 'sh',
  args: ['-c', `node -e "require('net').createServer().listen(${port})"`],
});

const PORTS = { free: 47311, taken: 47312, never: 47313 };

function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(true));
    probe.once('listening', () => probe.close(() => resolve(false)));
    probe.listen(port, '127.0.0.1');
  });
}

describe('measure script server handling', () => {
  it('leaves nothing listening on the port after it stops the server', async () => {
    const server = await startServer({ ...listener(PORTS.free), port: PORTS.free });
    expect(await isListening(PORTS.free)).toBe(true);
    await stopServer(server);
    expect(await isListening(PORTS.free)).toBe(false);
  });

  it('refuses to start when something already listens on the port, and leaves that thing alone', async () => {
    const squatter = createServer();
    await new Promise<void>((resolve) => squatter.listen(PORTS.taken, '127.0.0.1', resolve));
    try {
      await expect(startServer({ ...listener(PORTS.taken), port: PORTS.taken })).rejects.toThrow(/port 47312 is already in use/i);
      expect(await isListening(PORTS.taken)).toBe(true);
    } finally {
      await new Promise((resolve) => squatter.close(resolve));
    }
  });

  it('cleans up when the server never starts listening', async () => {
    await expect(
      startServer({ command: 'sh', args: ['-c', 'sleep 30.417'], port: PORTS.never, timeoutMs: 600 }),
    ).rejects.toThrow(/did not start/i);
    // The sleeping process must be gone too, so nothing is left running behind the failed start.
    const { execSync } = await import('node:child_process');
    expect(execSync('pgrep -fx "sleep 30.417" || true').toString().trim()).toBe('');
  });
});

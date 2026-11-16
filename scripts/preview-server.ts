// Starts and stops the `vite preview` server the measure script talks to. The server runs in its own process group
// so stopping it also stops what `npx` started on its behalf; killing `npx` alone left the server running.
import { spawn, type ChildProcess } from 'node:child_process';
import { connect, createServer } from 'node:net';

export interface ServerOptions {
  command: string;
  args: string[];
  port: number;
  timeoutMs?: number;
}

export interface Server {
  child: ChildProcess;
  port: number;
}

const HOST = '127.0.0.1';
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: HOST });
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('error', () => resolve(false));
  });
}

function canBind(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, HOST);
  });
}

function signalGroup(server: Server, signal: NodeJS.Signals): void {
  try {
    if (server.child.pid) process.kill(-server.child.pid, signal);
  } catch {
    // The group is already gone.
  }
}

/** Stops the server and everything it started, then waits until its port is free. */
export async function stopServer(server: Server): Promise<void> {
  signalGroup(server, 'SIGTERM');
  for (let waited = 0; waited < 5000; waited += 50) {
    if (!(await isListening(server.port)) && (await canBind(server.port))) return;
    if (waited === 2000) signalGroup(server, 'SIGKILL');
    await sleep(50);
  }
  signalGroup(server, 'SIGKILL');
}

/** Starts the server and waits until it listens. Fails at once if the port is taken, so an old server is never measured. */
export async function startServer({ command, args, port, timeoutMs = 20_000 }: ServerOptions): Promise<Server> {
  if (!(await canBind(port))) {
    throw new Error(`Port ${port} is already in use. Stop whatever is listening there, then run again.`);
  }
  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  const server: Server = { child, port };
  let exited = false;
  child.once('exit', () => (exited = true));
  for (let waited = 0; waited < timeoutMs; waited += 100) {
    if (await isListening(port)) return server;
    if (exited) break;
    await sleep(100);
  }
  await stopServer(server);
  throw new Error(`The preview server did not start on port ${port}. Run "npm run build" first.`);
}

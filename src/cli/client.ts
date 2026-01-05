import * as net from 'net';
import * as path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { DaemonRequest, DaemonResponse } from '../types.js';
import { DAEMON_PORT, DAEMON_HOST } from '../types.js';
import { findSkillMd } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Send a request to the daemon and wait for response.
 */
export async function sendRequest(
  request: Omit<DaemonRequest, 'id'>,
  configPath?: string
): Promise<DaemonResponse> {
  const id = uuidv4();
  const fullRequest: DaemonRequest = {
    ...request,
    id,
    configPath: configPath || findSkillMd() || undefined,
  };

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(DAEMON_PORT, DAEMON_HOST, () => {
      socket.write(JSON.stringify(fullRequest) + '\n');
    });

    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response: DaemonResponse = JSON.parse(line);
            if (response.id === id) {
              socket.end();
              resolve(response);
            }
          } catch (err) {
            socket.end();
            reject(new Error('Invalid response from daemon'));
          }
        }
      }
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('DAEMON_NOT_RUNNING'));
      } else {
        reject(err);
      }
    });

    socket.on('timeout', () => {
      socket.end();
      reject(new Error('Request timeout'));
    });

    socket.setTimeout(30000); // 30 second timeout
  });
}

/**
 * Check if daemon is running.
 */
export async function isDaemonRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection(DAEMON_PORT, DAEMON_HOST, () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Start the daemon as a detached background process.
 */
export async function startDaemon(configPath?: string): Promise<void> {
  const running = await isDaemonRunning();
  if (running) {
    console.error('Daemon is already running');
    return;
  }

  // Get path to daemon/run.js relative to this file (cli/client.js)
  const daemonScript = path.resolve(__dirname, '..', 'daemon', 'run.js');

  const args: string[] = [];
  if (configPath) {
    args.push('--config', configPath);
  }

  // Spawn detached process
  const child = spawn(process.execPath, [daemonScript, ...args], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
    cwd: process.cwd(),
  });

  child.unref();

  // Wait for daemon to be ready
  const maxWait = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const running = await isDaemonRunning();
    if (running) {
      console.error('Daemon started');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Daemon failed to start within timeout');
}

/**
 * Ensure daemon is running, starting it if necessary.
 */
export async function ensureDaemon(configPath?: string): Promise<void> {
  const running = await isDaemonRunning();
  if (!running) {
    await startDaemon(configPath);
  }
}

/**
 * Send request with auto-start.
 */
export async function sendRequestWithAutoStart(
  request: Omit<DaemonRequest, 'id'>,
  configPath?: string
): Promise<DaemonResponse> {
  try {
    return await sendRequest(request, configPath);
  } catch (err) {
    if (err instanceof Error && err.message === 'DAEMON_NOT_RUNNING') {
      console.error('Daemon not running, starting...');
      await startDaemon(configPath);
      return await sendRequest(request, configPath);
    }
    throw err;
  }
}

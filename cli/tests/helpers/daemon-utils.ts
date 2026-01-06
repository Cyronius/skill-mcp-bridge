import * as net from 'net';
import * as path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { DAEMON_PORT, DAEMON_HOST } from '../../src/types.js';
import type { DaemonRequest, DaemonResponse } from '../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PATH = path.resolve(__dirname, '..', '..', 'dist', 'index.js');

/**
 * Check if daemon is running
 */
export async function isDaemonRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection(DAEMON_PORT, DAEMON_HOST, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(1000);
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Stop daemon if running
 */
export async function stopDaemon(): Promise<void> {
  const running = await isDaemonRunning();
  if (!running) return;

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(DAEMON_PORT, DAEMON_HOST, () => {
      const request: DaemonRequest = {
        id: uuidv4(),
        type: 'shutdown',
      };
      socket.write(JSON.stringify(request) + '\n');
    });

    socket.on('data', () => {
      socket.end();
    });

    socket.on('close', () => {
      // Wait a bit for daemon to fully exit
      setTimeout(resolve, 500);
    });

    socket.on('error', (err) => {
      // If connection refused, daemon already stopped
      if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
        resolve();
      } else {
        reject(err);
      }
    });

    socket.setTimeout(5000);
    socket.on('timeout', () => {
      socket.destroy();
      resolve();
    });
  });
}

/**
 * Send request to daemon
 */
export async function sendRequest(
  request: Omit<DaemonRequest, 'id'>,
  configPath?: string
): Promise<DaemonResponse> {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const fullRequest: DaemonRequest = { ...request, id, configPath };

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
          } catch {
            socket.end();
            reject(new Error('Invalid response from daemon'));
          }
        }
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(30000);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Run CLI command and capture output
 */
export async function runCli(
  args: string[],
  options?: { configPath?: string; timeout?: number }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const fullArgs = [CLI_PATH];
    if (options?.configPath) {
      fullArgs.push('--config', options.configPath);
    }
    fullArgs.push(...args);

    const child = spawn(process.execPath, fullArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options?.timeout || 60000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    child.on('error', (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });
  });
}

/**
 * Wait for daemon to be ready
 */
export async function waitForDaemon(maxWaitMs = 10000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (await isDaemonRunning()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

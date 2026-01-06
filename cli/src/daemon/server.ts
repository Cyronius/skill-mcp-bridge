import * as net from 'net';
import { ServerManager } from './manager.js';
import { loadSkillConfig } from '../config/index.js';
import type { DaemonRequest, DaemonResponse } from '../types.js';
import { DAEMON_PORT, DAEMON_HOST } from '../types.js';

/**
 * TCP server that handles requests from CLI clients.
 */
export class DaemonServer {
  private server: net.Server | null = null;
  private manager: ServerManager;
  private configLoaded = false;

  constructor() {
    this.manager = new ServerManager();
  }

  /**
   * Start the daemon server.
   */
  async start(configPath?: string): Promise<void> {
    // Load config if provided
    if (configPath) {
      this.loadConfig(configPath);
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${DAEMON_PORT} is already in use. Is daemon already running?`));
        } else {
          reject(err);
        }
      });

      this.server.listen(DAEMON_PORT, DAEMON_HOST, () => {
        console.error(`[daemon] Listening on ${DAEMON_HOST}:${DAEMON_PORT}`);
        resolve();
      });
    });
  }

  private loadConfig(configPath: string): void {
    const { config, path } = loadSkillConfig(configPath);
    this.manager.loadConfig(config, path);
    this.configLoaded = true;
    console.error(`[daemon] Loaded config from: ${path}`);
  }

  private handleConnection(socket: net.Socket): void {
    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Handle newline-delimited JSON
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const request: DaemonRequest = JSON.parse(line);
            const response = await this.handleRequest(request);
            socket.write(JSON.stringify(response) + '\n');
          } catch (err) {
            const errorResponse: DaemonResponse = {
              id: 'unknown',
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            };
            socket.write(JSON.stringify(errorResponse) + '\n');
          }
        }
      }
    });

    socket.on('error', (err) => {
      console.error('[daemon] Socket error:', err.message);
    });
  }

  private async handleRequest(request: DaemonRequest): Promise<DaemonResponse> {
    const { id, type } = request;

    try {
      // Load config if provided and not already loaded
      if (request.configPath && !this.configLoaded) {
        this.loadConfig(request.configPath);
      }

      switch (type) {
        case 'call': {
          if (!request.server) {
            throw new Error('Missing "server" field');
          }
          if (!request.tool) {
            throw new Error('Missing "tool" field');
          }
          if (!this.configLoaded) {
            throw new Error('No config loaded. Provide configPath in request.');
          }

          const result = await this.manager.call(
            request.server,
            request.tool,
            request.args || {}
          );
          return { id, success: true, result };
        }

        case 'list-tools': {
          if (!request.server) {
            throw new Error('Missing "server" field');
          }
          if (!this.configLoaded) {
            throw new Error('No config loaded. Provide configPath in request.');
          }

          const tools = await this.manager.listServerTools(request.server);
          return { id, success: true, result: tools };
        }

        case 'list-servers': {
          if (!this.configLoaded) {
            throw new Error('No config loaded. Provide configPath in request.');
          }

          const servers = this.manager.listServers();
          return { id, success: true, result: servers };
        }

        case 'status': {
          const status = this.manager.getStatus();
          return { id, success: true, result: status };
        }

        case 'shutdown': {
          await this.manager.shutdown();
          // Schedule server close after response is sent
          setTimeout(() => {
            this.stop();
            process.exit(0);
          }, 100);
          return { id, success: true, result: { message: 'Shutting down' } };
        }

        default:
          throw new Error(`Unknown request type: ${type}`);
      }
    } catch (err) {
      return {
        id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Stop the daemon server.
   */
  async stop(): Promise<void> {
    await this.manager.shutdown();

    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

/**
 * Run the daemon as a standalone process.
 */
export async function runDaemon(configPath?: string): Promise<void> {
  const daemon = new DaemonServer();

  process.on('SIGTERM', async () => {
    console.error('[daemon] Received SIGTERM, shutting down...');
    await daemon.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.error('[daemon] Received SIGINT, shutting down...');
    await daemon.stop();
    process.exit(0);
  });

  await daemon.start(configPath);
}

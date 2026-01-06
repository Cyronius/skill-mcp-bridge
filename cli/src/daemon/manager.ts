import type { McpServerConfig, SkillConfig } from '../types.js';
import {
  connectToMcpServer,
  callTool,
  listTools,
  closeConnection,
  type McpConnection,
} from '../mcp/index.js';

export interface ManagedServer {
  config: McpServerConfig;
  connection: McpConnection | null;
  lastUsed: number;
  connecting: Promise<McpConnection> | null;
}

/**
 * Manages MCP server lifecycle - lazy initialization, caching, cleanup.
 */
export class ServerManager {
  private servers: Map<string, ManagedServer> = new Map();
  private config: SkillConfig | null = null;
  private configPath: string | null = null;
  private idleTimeoutMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(idleTimeoutMs: number = 5 * 60 * 1000) {
    this.idleTimeoutMs = idleTimeoutMs;
  }

  /**
   * Load skill configuration and register servers.
   */
  loadConfig(config: SkillConfig, configPath: string): void {
    this.config = config;
    this.configPath = configPath;

    // Register servers from config
    for (const serverConfig of config.mcpServers) {
      this.servers.set(serverConfig.name, {
        config: serverConfig,
        connection: null,
        lastUsed: 0,
        connecting: null,
      });
    }

    // Start cleanup interval
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupIdleServers();
      }, 60000); // Check every minute
    }
  }

  /**
   * Get or lazily initialize a server connection.
   */
  async getServer(name: string): Promise<McpConnection> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`Server '${name}' not configured`);
    }

    // Return existing connection if available
    if (server.connection) {
      server.lastUsed = Date.now();
      return server.connection;
    }

    // If already connecting, wait for it
    if (server.connecting) {
      return server.connecting;
    }

    // Start new connection
    server.connecting = this.initializeServer(server);

    try {
      const connection = await server.connecting;
      server.connection = connection;
      server.lastUsed = Date.now();
      return connection;
    } finally {
      server.connecting = null;
    }
  }

  private async initializeServer(server: ManagedServer): Promise<McpConnection> {
    console.error(`[daemon] Starting MCP server: ${server.config.name}`);
    const connection = await connectToMcpServer(server.config);
    console.error(`[daemon] Server ready: ${server.config.name}`);
    return connection;
  }

  /**
   * Call a tool on a server.
   */
  async call(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const connection = await this.getServer(serverName);
    return callTool(connection.client, toolName, args);
  }

  /**
   * List tools available on a server.
   */
  async listServerTools(
    serverName: string
  ): Promise<Array<{ name: string; description?: string; inputSchema?: unknown }>> {
    const connection = await this.getServer(serverName);
    return listTools(connection.client);
  }

  /**
   * List all configured servers.
   */
  listServers(): Array<{ name: string; running: boolean; lastUsed: number | null }> {
    const result: Array<{ name: string; running: boolean; lastUsed: number | null }> =
      [];
    for (const [name, server] of this.servers) {
      result.push({
        name,
        running: server.connection !== null,
        lastUsed: server.lastUsed || null,
      });
    }
    return result;
  }

  /**
   * Get daemon status.
   */
  getStatus(): {
    configPath: string | null;
    skillName: string | null;
    serverCount: number;
    runningCount: number;
  } {
    let runningCount = 0;
    for (const server of this.servers.values()) {
      if (server.connection) runningCount++;
    }

    return {
      configPath: this.configPath,
      skillName: this.config?.name || null,
      serverCount: this.servers.size,
      runningCount,
    };
  }

  /**
   * Clean up idle servers.
   */
  private async cleanupIdleServers(): Promise<void> {
    const now = Date.now();
    for (const [name, server] of this.servers) {
      if (
        server.connection &&
        server.lastUsed &&
        now - server.lastUsed > this.idleTimeoutMs
      ) {
        console.error(`[daemon] Stopping idle server: ${name}`);
        await closeConnection(server.connection);
        server.connection = null;
      }
    }
  }

  /**
   * Shutdown all servers and cleanup.
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    for (const [name, server] of this.servers) {
      if (server.connection) {
        console.error(`[daemon] Stopping server: ${name}`);
        await closeConnection(server.connection);
        server.connection = null;
      }
    }
  }
}

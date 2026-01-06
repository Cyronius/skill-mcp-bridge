// MCP Server configuration from SKILL.md frontmatter
export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// Skill configuration from SKILL.md
export interface SkillConfig {
  name: string;
  description: string;
  allowedTools?: string;
  mcpServers: McpServerConfig[];
}

// Daemon protocol messages
export interface DaemonRequest {
  id: string;
  type: 'call' | 'list-tools' | 'list-servers' | 'status' | 'shutdown';
  server?: string;
  tool?: string;
  args?: Record<string, unknown>;
  configPath?: string;
}

export interface DaemonResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

// Server state tracking
export interface ServerInstance {
  config: McpServerConfig;
  process: import('child_process').ChildProcess;
  client: unknown; // MCP Client instance
  lastUsed: number;
}

// Daemon state
export interface DaemonState {
  servers: Map<string, ServerInstance>;
  config: SkillConfig | null;
  configPath: string | null;
}

// Constants
export const DAEMON_PORT = 56789;
export const DAEMON_HOST = '127.0.0.1';
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

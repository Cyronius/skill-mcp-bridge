import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpServerConfig } from '../types.js';
import { substituteEnvVarsInObject } from '../config/env.js';

export interface McpConnection {
  client: Client;
  process: ChildProcess;
  transport: StdioClientTransport;
}

/**
 * Spawn an MCP server and establish connection.
 */
export async function connectToMcpServer(
  config: McpServerConfig
): Promise<McpConnection> {
  // Resolve environment variables
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
  };

  if (config.env) {
    const resolvedEnv = substituteEnvVarsInObject(config.env);
    Object.assign(env, resolvedEnv);
  }

  // Create the transport - it will spawn the process
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args || [],
    env,
  });

  // Create the client
  const client = new Client(
    {
      name: 'skill-mcp-bridge',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Connect
  await client.connect(transport);

  // Get the spawned process from transport (if available)
  // The transport manages the process internally
  const proc = (transport as unknown as { _process?: ChildProcess })._process;

  return {
    client,
    process: proc as ChildProcess,
    transport,
  };
}

/**
 * Call a tool on an MCP server.
 */
export async function callTool(
  client: Client,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = await client.callTool({
    name: toolName,
    arguments: args,
  });
  return result;
}

/**
 * List available tools on an MCP server.
 */
export async function listTools(
  client: Client
): Promise<Array<{ name: string; description?: string; inputSchema?: unknown }>> {
  const result = await client.listTools();
  return result.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

/**
 * Close an MCP connection gracefully.
 */
export async function closeConnection(connection: McpConnection): Promise<void> {
  try {
    await connection.client.close();
  } catch {
    // Ignore close errors
  }

  if (connection.process && !connection.process.killed) {
    connection.process.kill('SIGTERM');
  }
}

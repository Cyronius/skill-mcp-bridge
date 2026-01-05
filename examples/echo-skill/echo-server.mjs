#!/usr/bin/env node
/**
 * Simple echo MCP server for testing skill-mcp-bridge.
 * This is a minimal implementation that doesn't use the MCP SDK.
 */

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

let requestId = 0;

function sendResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result,
  };
  process.stdout.write(JSON.stringify(response) + '\n');
}

function sendError(id, code, message) {
  const response = {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  };
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    const { id, method, params } = request;

    switch (method) {
      case 'initialize':
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'echo-server',
            version: '1.0.0',
          },
        });
        break;

      case 'notifications/initialized':
        // No response needed for notifications
        break;

      case 'tools/list':
        sendResponse(id, {
          tools: [
            {
              name: 'echo',
              description: 'Echoes back the input message',
              inputSchema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    description: 'The message to echo back',
                  },
                },
                required: ['message'],
              },
            },
          ],
        });
        break;

      case 'tools/call':
        if (params?.name === 'echo') {
          const message = params.arguments?.message || 'No message provided';
          sendResponse(id, {
            content: [
              {
                type: 'text',
                text: `Echo: ${message}`,
              },
            ],
          });
        } else {
          sendError(id, -32601, `Unknown tool: ${params?.name}`);
        }
        break;

      default:
        sendError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    console.error('Parse error:', err.message);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

---
name: echo-example
description: Example skill demonstrating skill-mcp-bridge with a simple echo server. Use when testing the bridge.
allowed-tools: Bash(skill-mcp-bridge:*)
mcp-servers:
  - name: echo
    command: node
    args: ["echo-server.mjs"]
---

# Echo Example Skill

This is a simple example skill that uses a basic echo MCP server.

## Available Tools

### echo server
- `echo` - Returns whatever you send to it

## Usage

List available tools:
```bash
skill-mcp-bridge list-tools echo
```

Call the echo tool:
```bash
skill-mcp-bridge call echo echo '{"message": "Hello, World!"}'
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Run directly with tsx (development)
npm run start      # Run compiled output
```

## CLI Commands

The tool is invoked as `skill-mcp-bridge` (or via `npm run dev` during development):

```bash
skill-mcp-bridge call <server> <tool> [args]   # Call a tool on an MCP server
skill-mcp-bridge list-tools <server>           # List available tools
skill-mcp-bridge list-servers                  # List configured MCP servers
skill-mcp-bridge start                         # Start the daemon
skill-mcp-bridge stop                          # Stop the daemon
skill-mcp-bridge status                        # Show daemon status
skill-mcp-bridge validate                      # Validate SKILL.md config
```

Use `-c, --config <path>` to specify a custom SKILL.md path.

## Architecture

This CLI bridges Claude Code skills with MCP (Model Context Protocol) servers. It uses a daemon architecture for persistent server connections.

### Core Flow

1. **CLI** (`src/cli/`) - Command parsing and daemon communication
2. **Daemon** (`src/daemon/`) - Background TCP server on port 56789 managing MCP connections
3. **MCP Client** (`src/mcp/`) - Spawns and communicates with MCP servers via stdio
4. **Config** (`src/config/`) - Parses SKILL.md frontmatter for server definitions

### Key Design Decisions

- **Daemon pattern**: MCP servers are spawned lazily and cached by a background daemon. This avoids startup overhead on each CLI invocation.
- **Auto-start**: The daemon starts automatically on first command if not running.
- **Idle cleanup**: Unused server connections are closed after 5 minutes.
- **TCP protocol**: CLI communicates with daemon via newline-delimited JSON over TCP.

### SKILL.md Format

Skills are configured via YAML frontmatter in SKILL.md files:

```yaml
---
name: my-skill
description: Description of the skill
allowed-tools: Bash(skill-mcp-bridge:*)
mcp-servers:
  - name: server-name
    command: node
    args: ["server.js"]
    env:
      API_KEY: "${MY_API_KEY}"
---
```

Environment variables use `${VAR}` syntax and are resolved at runtime.

### File Structure

- `src/types.ts` - Shared type definitions and constants
- `src/cli/client.ts` - TCP client for daemon communication, auto-start logic
- `src/cli/commands.ts` - Commander-based CLI command definitions
- `src/daemon/server.ts` - TCP server handling client requests
- `src/daemon/manager.ts` - MCP server lifecycle management (lazy init, caching)
- `src/mcp/client.ts` - MCP SDK wrapper for spawning servers and calling tools
- `src/config/loader.ts` - SKILL.md discovery (walks up directory tree)
- `src/config/parser.ts` - gray-matter based frontmatter parsing

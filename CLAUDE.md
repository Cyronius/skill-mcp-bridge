# CLAUDE.md

This file provides guidance to Claude Code when working on the mcp-bridge skill.

## Project Structure

This is a Claude Code skill with an embedded npm package:

```
mcp-bridge/
├── SKILL.md              # Skill documentation (meta-skill, no mcp-servers)
├── README.md             # Installation guide
├── CLAUDE.md             # This file
├── install.ps1           # Windows install script
├── install.sh            # Unix install script
├── .env.example          # Template (empty - bridge doesn't need env vars)
├── .gitignore
├── examples/             # Example skills using the bridge
│   ├── echo-skill/       # Simple test server
│   ├── sql-skill/        # SQL Server example
│   └── playwright-skill/ # Browser automation example
└── cli/                  # The npm package
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── bin/
    ├── src/
    ├── tests/
    └── dist/             # (built)
```

## Build & Run Commands

All npm commands must be run from the `cli/` subdirectory:

```bash
cd cli
npm run build      # Compile TypeScript to dist/
npm run dev        # Run directly with tsx (development)
npm run start      # Run compiled output
npm test           # Run tests
npm run install-global  # Build and link globally
```

## CLI Commands

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

The CLI bridges Claude Code skills with MCP (Model Context Protocol) servers using a daemon architecture.

### Core Flow

1. **CLI** (`cli/src/cli/`) - Command parsing and daemon communication
2. **Daemon** (`cli/src/daemon/`) - Background TCP server on port 56789 managing MCP connections
3. **MCP Client** (`cli/src/mcp/`) - Spawns and communicates with MCP servers via stdio
4. **Config** (`cli/src/config/`) - Parses SKILL.md frontmatter for server definitions

### Key Design Decisions

- **Daemon pattern**: MCP servers are lazily spawned and cached by a background daemon
- **Auto-start**: Daemon starts automatically on first command if not running
- **Idle cleanup**: Unused server connections close after 5 minutes
- **TCP protocol**: CLI communicates with daemon via newline-delimited JSON

### File Structure

- `cli/src/types.ts` - Shared type definitions and constants
- `cli/src/cli/client.ts` - TCP client for daemon communication, auto-start logic
- `cli/src/cli/commands.ts` - Commander-based CLI command definitions
- `cli/src/daemon/server.ts` - TCP server handling client requests
- `cli/src/daemon/manager.ts` - MCP server lifecycle management (lazy init, caching)
- `cli/src/mcp/client.ts` - MCP SDK wrapper for spawning servers and calling tools
- `cli/src/config/loader.ts` - SKILL.md discovery (walks up directory tree), .env loading
- `cli/src/config/parser.ts` - gray-matter based frontmatter parsing

### SKILL.md Format

Skills that use the bridge define MCP servers in YAML frontmatter:

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

Environment variables use `${VAR}` syntax and are resolved from:
1. System environment
2. `.env` file in the same directory as SKILL.md

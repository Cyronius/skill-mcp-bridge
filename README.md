# skill-mcp-bridge

A CLI utility that bridges Claude Code skills with MCP (Model Context Protocol) servers.

## Problem

1. **Token bloat**: MCP servers in Claude Code stuff full tool schemas into context
2. **Unreliable management**: Claude Code (especially VS Code) poorly manages MCP server lifecycle

## Solution

This utility lets Claude Code skills use MCP servers through a lightweight CLI interface:
- Skills define MCP servers in YAML frontmatter
- Claude uses simple CLI commands instead of full MCP protocol
- A background daemon manages MCP server lifecycle
- Multiple VS Code instances share the same daemon

## Installation

```bash
npm install -g skill-mcp-bridge
```

Or for development:
```bash
git clone <repo>
cd skill-mcp-bridge
npm install
npm run build
npm link
```

## Usage

### SKILL.md Format

Create a skill with MCP servers defined in the frontmatter:

```yaml
---
name: database-tools
description: Query databases. Use for SQL or data operations.
allowed-tools: Bash(skill-mcp-bridge:*)
mcp-servers:
  - name: postgres
    command: npx
    args: ["-y", "@modelcontextprotocol/server-postgres"]
    env:
      DATABASE_URL: "${DATABASE_URL}"
---

# Database Tools

## Available Tools

### postgres
- `query` - Execute SQL query

## Usage

skill-mcp-bridge call postgres query '{"sql": "SELECT * FROM users LIMIT 10"}'
```

### CLI Commands

```bash
# Call a tool on an MCP server
skill-mcp-bridge call <server> <tool> '<json-args>'

# List available tools on a server
skill-mcp-bridge list-tools <server>

# List configured servers
skill-mcp-bridge list-servers

# Daemon management
skill-mcp-bridge start     # Start daemon explicitly
skill-mcp-bridge stop      # Stop daemon and all servers
skill-mcp-bridge status    # Show daemon/server status

# Validate SKILL.md
skill-mcp-bridge validate
```

### Options

```bash
-c, --config <path>  # Path to SKILL.md (auto-detected by default)
-V, --version        # Show version
-h, --help           # Show help
```

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  SKILL.md                                               │
│  - MCP servers in YAML frontmatter                      │
│  - Human-readable tool documentation                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Claude calls CLI via Bash                              │
│  skill-mcp-bridge call postgres query '{"sql": "..."}'  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ (auto-starts if needed)
┌─────────────────────────────────────────────────────────┐
│  skill-mcp-bridge daemon (TCP localhost:56789)          │
│  - Shared across all VS Code instances                  │
│  - Lazy spawns MCP servers on first use                 │
│  - Keeps servers warm for fast subsequent calls         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  MCP Servers (stdio transport)                          │
│  - Standard MCP protocol                                │
│  - Managed by daemon, invisible to Claude               │
└─────────────────────────────────────────────────────────┘
```

## Benefits

- **Token efficient**: Claude only sees skill instructions + JSON results
- **Fast**: Daemon keeps servers warm, no startup overhead after first call
- **Reliable**: Bypasses Claude Code's MCP management entirely
- **Shareable**: Package skills with their MCP dependencies

## Environment Variables

Use `${VAR}` syntax in SKILL.md for environment variable substitution:

```yaml
mcp-servers:
  - name: db
    command: npx
    args: ["-y", "@modelcontextprotocol/server-postgres"]
    env:
      DATABASE_URL: "${DATABASE_URL}"
```

## Examples

See the `examples/` directory for sample skills.

## License

MIT

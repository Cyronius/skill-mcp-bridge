---
name: mcp-bridge
description: Infrastructure skill providing the skill-mcp-bridge CLI for connecting Claude Code skills to MCP servers. Not triggered directly - other skills define mcp-servers in their frontmatter and use allowed-tools Bash(skill-mcp-bridge:*).
---

# MCP Bridge Skill

This skill provides the `skill-mcp-bridge` CLI tool that allows Claude Code skills to interact with MCP (Model Context Protocol) servers through a simple command-line interface.

## Overview

The MCP Bridge solves two problems with native MCP integration in Claude Code:

1. **Token bloat**: MCP servers normally inject full tool schemas into context
2. **Unreliable lifecycle**: Claude Code (especially VS Code extension) poorly manages MCP server processes

The bridge provides:
- A background daemon that manages MCP server lifecycle
- Lazy server spawning on first use
- Connection caching with 5-minute idle timeout
- Shared daemon across all VS Code instances

## Installation

Run the install script after copying to `~/.claude/skills/mcp-bridge/`:

```powershell
# Windows
.\install.ps1

# Unix/macOS
./install.sh
```

Or manually:

```bash
cd cli
npm install
npm run build
npm link
```

## Creating Skills That Use the Bridge

To use MCP servers in your skill, add `mcp-servers` to your SKILL.md frontmatter:

```yaml
---
name: my-database-skill
description: Query the database using MCP tools.
allowed-tools: Bash(skill-mcp-bridge:*)
mcp-servers:
  - name: postgres
    command: npx
    args: ["-y", "@modelcontextprotocol/server-postgres"]
    env:
      DATABASE_URL: "${DATABASE_URL}"
---

# My Database Skill

Use `skill-mcp-bridge` to query the database:

skill-mcp-bridge list-tools postgres
skill-mcp-bridge call postgres query '{"sql": "SELECT * FROM users LIMIT 10"}'
```

See the `examples/` directory for complete example skills.

## CLI Commands

```bash
# Call a tool on an MCP server
skill-mcp-bridge call <server> <tool> '<json-args>'

# List available tools on a server
skill-mcp-bridge list-tools <server>

# List configured servers (from current SKILL.md)
skill-mcp-bridge list-servers

# Daemon management
skill-mcp-bridge start     # Start daemon explicitly
skill-mcp-bridge stop      # Stop daemon and all servers
skill-mcp-bridge status    # Show daemon/server status

# Validate SKILL.md configuration
skill-mcp-bridge validate

# Use custom config file
skill-mcp-bridge -c /path/to/SKILL.md <command>
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  SKILL.md (your skill)                                  │
│  - MCP servers defined in YAML frontmatter              │
│  - Human-readable documentation                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Claude Code calls CLI via Bash                         │
│  skill-mcp-bridge call postgres query '{"sql": "..."}'  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ (auto-starts if needed)
┌─────────────────────────────────────────────────────────┐
│  skill-mcp-bridge daemon (TCP localhost:56789)          │
│  - Shared across all Claude Code instances              │
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

## Environment Variables

In your skill's SKILL.md, use `${VAR}` syntax for environment variables:

```yaml
mcp-servers:
  - name: db
    command: npx
    args: ["-y", "mssql-mcp-server"]
    env:
      MSSQL_CONNECTION_STRING: "${MSSQL_CONNECTION_STRING}"
```

Variables are resolved from:
1. System environment
2. `.env` file in the same directory as SKILL.md

## Troubleshooting

### Command not found

Ensure the CLI is installed globally:

```bash
cd ~/.claude/skills/mcp-bridge/cli
npm link
```

### Server not starting

Check daemon status:

```bash
skill-mcp-bridge status
```

Stop and restart:

```bash
skill-mcp-bridge stop
skill-mcp-bridge start
```

### Environment variables not resolving

Create a `.env` file in your skill directory (same location as SKILL.md).

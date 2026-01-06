---
name: sql-example
description: Example skill for querying SQL Server databases via the MCP bridge. Use this skill when you need to execute SQL queries, list tables, or describe table schemas.
allowed-tools: Bash(skill-mcp-bridge:*)
mcp-servers:
  - name: sql
    command: npx
    args: ["-y", "mssql-mcp-server"]
    env:
      MSSQL_CONNECTION_STRING: "${MSSQL_CONNECTION_STRING}"
---

# SQL Server Example Skill

This example skill demonstrates how to use the MCP bridge with SQL Server.

## Setup

1. Copy this directory to your skills folder or use it in place
2. Create a `.env` file with your connection string:
   ```
   MSSQL_CONNECTION_STRING=Server=your-server.database.windows.net;Database=your-db;User Id=your-user;Password=your-pass;Encrypt=true
   ```

## Available Tools

Use `skill-mcp-bridge list-tools sql` to see all available tools.

Common tools from mssql-mcp-server:
- `execute_query` - Execute a SQL query and return results

## Usage Examples

### Execute a Query

```bash
skill-mcp-bridge call sql execute_query '{"query": "SELECT TOP 10 * FROM users"}'
```

### Count Records

```bash
skill-mcp-bridge call sql execute_query '{"query": "SELECT COUNT(*) as total FROM orders"}'
```

### Get Table Schema

```bash
skill-mcp-bridge call sql execute_query '{"query": "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '\''users'\''"}'
```

### List Tables

```bash
skill-mcp-bridge call sql execute_query '{"query": "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = '\''BASE TABLE'\''"}'
```

## Output Format

Results are returned as JSON:

```json
{
  "query": "SELECT TOP 1 * FROM users",
  "rowCount": 1,
  "data": [
    {
      "id": "abc123",
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

## Troubleshooting

### Connection Failed

- Check your `MSSQL_CONNECTION_STRING` in `.env`
- Ensure the database server is accessible
- Verify firewall rules allow the connection

### Environment Variable Not Set

Create a `.env` file in this directory (same location as this SKILL.md).

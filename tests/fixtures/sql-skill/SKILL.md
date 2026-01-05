---
name: sql-test
description: SQL Server MCP integration test skill
mcp-servers:
  - name: sql
    command: npx
    args: ["-y", "mssql-mcp-server"]
    env:
      MSSQL_CONNECTION_STRING: "${MSSQL_CONNECTION_STRING}"
---

# SQL Test Skill

Test fixture for SQL Server MCP integration tests.

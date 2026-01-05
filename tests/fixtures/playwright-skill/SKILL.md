---
name: playwright-test
description: Playwright MCP integration test skill
mcp-servers:
  - name: playwright
    command: npx
    args: ["-y", "@playwright/mcp@latest", "--headless"]
---

# Playwright Test Skill

Test fixture for Playwright MCP integration tests.

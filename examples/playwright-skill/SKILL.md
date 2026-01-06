---
name: playwright-example
description: Example skill for browser automation via the MCP bridge. Use this skill when you need to navigate websites, take screenshots, click elements, or interact with web pages.
allowed-tools: Bash(skill-mcp-bridge:*)
mcp-servers:
  - name: playwright
    command: npx
    args: ["-y", "@playwright/mcp@latest", "--headless"]
---

# Playwright Browser Automation Example Skill

This example skill demonstrates how to use the MCP bridge with Playwright for browser automation.

## Setup

No environment variables required! The Playwright MCP server runs in headless mode by default.

## Available Tools

Use `skill-mcp-bridge list-tools playwright` to see all available tools.

Common tools from @playwright/mcp:
- `browser_navigate` - Navigate to a URL
- `browser_screenshot` - Take a screenshot
- `browser_click` - Click an element
- `browser_fill` - Fill a form field
- `browser_get_text` - Get text content from an element

## Usage Examples

### Navigate to a URL

```bash
skill-mcp-bridge call playwright browser_navigate '{"url": "https://example.com"}'
```

### Take a Screenshot

```bash
skill-mcp-bridge call playwright browser_screenshot '{}'
```

### Click an Element

```bash
skill-mcp-bridge call playwright browser_click '{"selector": "#submit-button"}'
```

### Fill a Form Field

```bash
skill-mcp-bridge call playwright browser_fill '{"selector": "#email", "value": "test@example.com"}'
```

### Get Page Text

```bash
skill-mcp-bridge call playwright browser_get_text '{"selector": "h1"}'
```

## Workflow Example

Complete login flow:

```bash
# Navigate to login page
skill-mcp-bridge call playwright browser_navigate '{"url": "https://example.com/login"}'

# Fill email
skill-mcp-bridge call playwright browser_fill '{"selector": "#email", "value": "user@example.com"}'

# Fill password
skill-mcp-bridge call playwright browser_fill '{"selector": "#password", "value": "secret"}'

# Click login button
skill-mcp-bridge call playwright browser_click '{"selector": "#login-button"}'

# Take screenshot to verify
skill-mcp-bridge call playwright browser_screenshot '{}'
```

## Output Format

Results are returned as JSON. Screenshot results include base64-encoded image data.

## Troubleshooting

### Browser Not Starting

- Ensure you have sufficient system resources
- Try stopping the daemon and restarting: `skill-mcp-bridge stop`

### Element Not Found

- Check your selector syntax
- The page may not have finished loading - add a wait or retry

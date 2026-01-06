import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  stopDaemon,
  runCli,
  waitForDaemon,
} from '../helpers/daemon-utils.js';
import { getFixturePath, PLAYWRIGHT_CONFIG } from '../helpers/test-config.js';

describe('Playwright MCP Integration', () => {
  const configPath = getFixturePath('playwright-skill');

  beforeAll(async () => {
    // Stop any existing daemon
    await stopDaemon();
  });

  afterAll(async () => {
    await stopDaemon();
  });

  describe('list-tools command', () => {
    it('should list Playwright tools', async () => {
      const { stdout, stderr, exitCode } = await runCli(['list-tools', 'playwright'], {
        configPath,
        timeout: 120000,
      });

      console.log('stderr:', stderr);
      console.log('stdout:', stdout);

      expect(exitCode).toBe(0);
      const tools = JSON.parse(stdout);
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Log tool names for debugging
      const toolNames = tools.map((t: { name: string }) => t.name);
      console.log('Available Playwright tools:', toolNames);

      // Playwright MCP should have navigation/browser tools
      const hasBrowserTools = toolNames.some((name: string) =>
        name.includes('navigate') ||
        name.includes('browser') ||
        name.includes('click') ||
        name.includes('goto')
      );
      expect(hasBrowserTools).toBe(true);
    });
  });

  describe('list-servers command', () => {
    it('should list configured playwright server', async () => {
      // Ensure daemon is running first
      await runCli(['start'], { configPath });
      await waitForDaemon();

      const { stdout, exitCode } = await runCli(['list-servers'], { configPath });
      expect(exitCode).toBe(0);

      const servers = JSON.parse(stdout);
      expect(Array.isArray(servers)).toBe(true);
      expect(servers.find((s: { name: string }) => s.name === 'playwright')).toBeDefined();
    });
  });

  describe('call command - browser navigation', () => {
    it('should navigate to a URL', async () => {
      // First get the actual tool names
      const { stdout: toolsStdout } = await runCli(['list-tools', 'playwright'], {
        configPath,
        timeout: 120000,
      });

      const tools = JSON.parse(toolsStdout);
      const toolNames = tools.map((t: { name: string }) => t.name);
      console.log('Playwright tools:', toolNames);

      // Find the navigate tool - could be various names
      const possibleNavigateTools = ['browser_navigate', 'navigate', 'goto', 'browser_goto'];
      const navigateTool = possibleNavigateTools.find(name => toolNames.includes(name));

      if (!navigateTool) {
        console.log('No navigate tool found, skipping navigation test');
        return;
      }

      console.log('Using navigate tool:', navigateTool);

      const args = JSON.stringify({
        url: PLAYWRIGHT_CONFIG.testUrl,
      });

      const { stdout, stderr, exitCode } = await runCli(
        ['call', 'playwright', navigateTool, args],
        { configPath, timeout: 120000 }
      );

      console.log('Navigate stderr:', stderr);
      console.log('Navigate stdout:', stdout);

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result).toBeDefined();
    });
  });

  describe('call command - screenshot', () => {
    it('should take a screenshot', async () => {
      // First get the actual tool names
      const { stdout: toolsStdout } = await runCli(['list-tools', 'playwright'], {
        configPath,
        timeout: 120000,
      });

      const tools = JSON.parse(toolsStdout);
      const toolNames = tools.map((t: { name: string }) => t.name);

      // Find the screenshot tool
      const possibleScreenshotTools = ['browser_screenshot', 'screenshot', 'take_screenshot', 'browser_take_screenshot'];
      const screenshotTool = possibleScreenshotTools.find(name => toolNames.includes(name));

      if (!screenshotTool) {
        console.log('No screenshot tool found, skipping screenshot test');
        return;
      }

      console.log('Using screenshot tool:', screenshotTool);

      // Navigate first if we have a navigate tool
      const possibleNavigateTools = ['browser_navigate', 'navigate', 'goto', 'browser_goto'];
      const navigateTool = possibleNavigateTools.find(name => toolNames.includes(name));

      if (navigateTool) {
        await runCli(
          ['call', 'playwright', navigateTool, JSON.stringify({ url: PLAYWRIGHT_CONFIG.testUrl })],
          { configPath, timeout: 120000 }
        );
      }

      // Take screenshot
      const { stdout, stderr, exitCode } = await runCli(
        ['call', 'playwright', screenshotTool, '{}'],
        { configPath, timeout: 120000 }
      );

      console.log('Screenshot stderr:', stderr);
      console.log('Screenshot stdout:', stdout);

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result).toBeDefined();
    });
  });
});

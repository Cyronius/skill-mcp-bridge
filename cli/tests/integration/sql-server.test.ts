import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  stopDaemon,
  runCli,
  waitForDaemon,
} from '../helpers/daemon-utils.js';
import { getFixturePath, SQL_CONFIG } from '../helpers/test-config.js';

describe('SQL Server MCP Integration', () => {
  const configPath = getFixturePath('sql-skill');
  const hasConfig = SQL_CONFIG.hasConfig();

  beforeAll(async () => {
    if (!hasConfig) {
      console.log('Skipping SQL tests - MSSQL_CONNECTION_STRING not set');
    }
    // Stop any existing daemon
    await stopDaemon();
  });

  afterAll(async () => {
    await stopDaemon();
  });

  // Skip all tests if no SQL config
  const conditionalIt = hasConfig ? it : it.skip;

  describe('list-tools command', () => {
    conditionalIt('should list SQL Server tools', async () => {
      const { stdout, stderr, exitCode } = await runCli(['list-tools', 'sql'], {
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
      console.log('Available SQL tools:', toolNames);
    });
  });

  describe('list-servers command', () => {
    conditionalIt('should list configured SQL server', async () => {
      // Ensure daemon is running first
      await runCli(['start'], { configPath });
      await waitForDaemon();

      const { stdout, exitCode } = await runCli(['list-servers'], { configPath });
      expect(exitCode).toBe(0);

      const servers = JSON.parse(stdout);
      expect(Array.isArray(servers)).toBe(true);
      expect(servers.find((s: { name: string }) => s.name === 'sql')).toBeDefined();
    });
  });

  describe('call command - query', () => {
    conditionalIt('should execute a simple SELECT query', async () => {
      // Try different tool names that various SQL MCP servers use
      const possibleToolNames = ['query', 'execute_query', 'run_query', 'mssql_query'];

      // First get the actual tool names
      const { stdout: toolsStdout } = await runCli(['list-tools', 'sql'], {
        configPath,
        timeout: 120000,
      });

      const tools = JSON.parse(toolsStdout);
      const toolNames = tools.map((t: { name: string }) => t.name);

      // Find the query tool
      const queryTool = possibleToolNames.find(name => toolNames.includes(name)) || toolNames[0];
      console.log('Using query tool:', queryTool);

      const args = JSON.stringify({
        query: 'SELECT 1 AS test_value',
        sql: 'SELECT 1 AS test_value', // Some servers use 'sql' instead of 'query'
      });

      const { stdout, stderr, exitCode } = await runCli(
        ['call', 'sql', queryTool, args],
        { configPath, timeout: 120000 }
      );

      console.log('Query stderr:', stderr);
      console.log('Query stdout:', stdout);

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result).toBeDefined();
    });
  });
});

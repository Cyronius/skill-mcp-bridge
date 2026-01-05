import { describe, it, expect, afterEach, afterAll } from 'vitest';
import {
  isDaemonRunning,
  stopDaemon,
  runCli,
  waitForDaemon,
} from '../helpers/daemon-utils.js';
import { getFixturePath } from '../helpers/test-config.js';

describe('Daemon Lifecycle', () => {
  // Use playwright skill as it doesn't require env vars
  const configPath = getFixturePath('playwright-skill');

  afterEach(async () => {
    // Clean up daemon after each test
    await stopDaemon();
  });

  afterAll(async () => {
    // Final cleanup
    await stopDaemon();
  });

  describe('status command', () => {
    it('should report daemon not running when stopped', async () => {
      await stopDaemon();
      const { stdout, exitCode } = await runCli(['status']);
      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.running).toBe(false);
    });
  });

  describe('start command', () => {
    it('should start the daemon', async () => {
      await stopDaemon();
      const { exitCode } = await runCli(['start'], { configPath });
      expect(exitCode).toBe(0);

      const running = await waitForDaemon();
      expect(running).toBe(true);
    });

    it('should report already running when started twice', async () => {
      await runCli(['start'], { configPath });
      await waitForDaemon();

      const { stdout, exitCode } = await runCli(['start'], { configPath });
      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.message).toContain('already running');
    });
  });

  describe('stop command', () => {
    it('should stop running daemon', async () => {
      await runCli(['start'], { configPath });
      await waitForDaemon();

      const { exitCode } = await runCli(['stop']);
      expect(exitCode).toBe(0);

      // Wait a moment for cleanup
      await new Promise((r) => setTimeout(r, 500));

      // Verify daemon stopped
      const running = await isDaemonRunning();
      expect(running).toBe(false);
    });

    it('should handle stop when daemon not running', async () => {
      await stopDaemon();
      const { stdout, exitCode } = await runCli(['stop']);
      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.message).toContain('not running');
    });
  });

  describe('auto-start behavior', () => {
    it('should auto-start daemon on list-servers command', async () => {
      await stopDaemon();

      // Verify daemon not running
      expect(await isDaemonRunning()).toBe(false);

      // list-servers should auto-start daemon
      const { stderr } = await runCli(['list-servers'], { configPath });
      expect(stderr).toContain('starting');

      // Verify daemon is now running
      expect(await isDaemonRunning()).toBe(true);
    });
  });
});

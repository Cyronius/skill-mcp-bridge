import { Command } from 'commander';
import { sendRequestWithAutoStart, sendRequest, isDaemonRunning, startDaemon } from './client.js';
import { runDaemon } from '../daemon/index.js';
import { loadSkillConfig, findSkillMd } from '../config/index.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('skill-mcp-bridge')
    .description('Bridge Claude Code skills with MCP servers')
    .version('1.0.0');

  // Global options
  program.option('-c, --config <path>', 'Path to SKILL.md config file');

  // call command
  program
    .command('call <server> <tool> [args]')
    .description('Call a tool on an MCP server')
    .action(async (server: string, tool: string, argsStr?: string) => {
      const configPath = program.opts().config;

      let args: Record<string, unknown> = {};
      if (argsStr) {
        try {
          args = JSON.parse(argsStr);
        } catch {
          console.error(JSON.stringify({ success: false, error: 'Invalid JSON arguments' }));
          process.exit(1);
        }
      }

      try {
        const response = await sendRequestWithAutoStart(
          { type: 'call', server, tool, args },
          configPath
        );

        if (response.success) {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          console.error(JSON.stringify({ success: false, error: response.error }));
          process.exit(1);
        }
      } catch (err) {
        console.error(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
        process.exit(1);
      }
    });

  // list-tools command
  program
    .command('list-tools <server>')
    .description('List available tools on an MCP server')
    .action(async (server: string) => {
      const configPath = program.opts().config;

      try {
        const response = await sendRequestWithAutoStart(
          { type: 'list-tools', server },
          configPath
        );

        if (response.success) {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          console.error(JSON.stringify({ success: false, error: response.error }));
          process.exit(1);
        }
      } catch (err) {
        console.error(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
        process.exit(1);
      }
    });

  // list-servers command
  program
    .command('list-servers')
    .description('List configured MCP servers')
    .action(async () => {
      const configPath = program.opts().config;

      try {
        const response = await sendRequestWithAutoStart(
          { type: 'list-servers' },
          configPath
        );

        if (response.success) {
          console.log(JSON.stringify(response.result, null, 2));
        } else {
          console.error(JSON.stringify({ success: false, error: response.error }));
          process.exit(1);
        }
      } catch (err) {
        console.error(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
        process.exit(1);
      }
    });

  // start command
  program
    .command('start')
    .description('Start the daemon')
    .action(async () => {
      const configPath = program.opts().config;

      const running = await isDaemonRunning();
      if (running) {
        console.log(JSON.stringify({ success: true, message: 'Daemon already running' }));
        return;
      }

      try {
        await startDaemon(configPath);
        console.log(JSON.stringify({ success: true, message: 'Daemon started' }));
      } catch (err) {
        console.error(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
        process.exit(1);
      }
    });

  // stop command
  program
    .command('stop')
    .description('Stop the daemon')
    .action(async () => {
      try {
        const response = await sendRequest({ type: 'shutdown' });

        if (response.success) {
          console.log(JSON.stringify({ success: true, message: 'Daemon stopped' }));
        } else {
          console.error(JSON.stringify({ success: false, error: response.error }));
          process.exit(1);
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'DAEMON_NOT_RUNNING') {
          console.log(JSON.stringify({ success: true, message: 'Daemon not running' }));
        } else {
          console.error(JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          }));
          process.exit(1);
        }
      }
    });

  // status command
  program
    .command('status')
    .description('Show daemon status')
    .action(async () => {
      const running = await isDaemonRunning();

      if (!running) {
        console.log(JSON.stringify({
          running: false,
          message: 'Daemon not running'
        }));
        return;
      }

      try {
        const response = await sendRequest({ type: 'status' });

        if (response.success) {
          console.log(JSON.stringify({
            running: true,
            ...response.result as object
          }, null, 2));
        } else {
          console.error(JSON.stringify({ success: false, error: response.error }));
          process.exit(1);
        }
      } catch (err) {
        console.error(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
        process.exit(1);
      }
    });

  // validate command
  program
    .command('validate')
    .description('Validate SKILL.md configuration')
    .action(() => {
      const configPath = program.opts().config;

      try {
        const skillPath = configPath || findSkillMd();
        if (!skillPath) {
          console.error(JSON.stringify({
            success: false,
            error: 'No SKILL.md found'
          }));
          process.exit(1);
        }

        const { config, path } = loadSkillConfig(configPath);
        console.log(JSON.stringify({
          success: true,
          path,
          name: config.name,
          description: config.description,
          servers: config.mcpServers.map(s => s.name)
        }, null, 2));
      } catch (err) {
        console.error(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }));
        process.exit(1);
      }
    });

  // Internal daemon command (not shown in help)
  program
    .command('--daemon', { hidden: true })
    .action(async () => {
      const configPath = program.opts().config;
      await runDaemon(configPath);
    });

  return program;
}

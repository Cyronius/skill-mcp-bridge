#!/usr/bin/env node
/**
 * Standalone script to run the daemon.
 * This is spawned as a detached process by the CLI.
 */
import { runDaemon } from './server.js';

// Parse arguments
const args = process.argv.slice(2);
let configPath: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--config' && args[i + 1]) {
    configPath = args[i + 1];
    i++;
  }
}

runDaemon(configPath).catch((err) => {
  console.error('Failed to start daemon:', err.message);
  process.exit(1);
});

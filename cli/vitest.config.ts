import 'dotenv/config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120000, // 2 minutes for MCP server startup
    hookTimeout: 60000,
    sequence: {
      concurrent: false, // Run tests sequentially (shared port 56789)
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Share daemon across tests in a file
      },
    },
  },
});

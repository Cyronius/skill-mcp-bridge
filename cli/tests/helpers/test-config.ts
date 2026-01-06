import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

export function getFixturePath(fixture: string): string {
  return path.join(FIXTURES_DIR, fixture, 'SKILL.md');
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function hasEnv(name: string): boolean {
  return !!process.env[name];
}

// SQL Server test configuration
export const SQL_CONFIG = {
  connectionStringEnv: 'MSSQL_CONNECTION_STRING',
  hasConfig: () => hasEnv('MSSQL_CONNECTION_STRING'),
};

// Playwright test configuration
export const PLAYWRIGHT_CONFIG = {
  testUrl: 'https://example.com',
};

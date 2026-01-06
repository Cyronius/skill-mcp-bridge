import * as fs from 'fs';
import * as path from 'path';
import { parseSkillMd } from './parser.js';
import type { SkillConfig } from '../types.js';

/**
 * Load .env file from the same directory as SKILL.md
 */
function loadEnvFile(skillPath: string): void {
  const skillDir = path.dirname(skillPath);
  const envPath = path.join(skillDir, '.env');

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        // Only set if not already defined (allows system env to override)
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  }
}

/**
 * Find SKILL.md by walking up the directory tree.
 * Searches in:
 * 1. Current directory
 * 2. .claude/skills/<name>/SKILL.md in current and parent directories
 */
export function findSkillMd(startDir: string = process.cwd()): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    // Check for SKILL.md in current directory
    const directPath = path.join(currentDir, 'SKILL.md');
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    // Check .claude/skills/*/SKILL.md
    const skillsDir = path.join(currentDir, '.claude', 'skills');
    if (fs.existsSync(skillsDir)) {
      try {
        const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const dir of skillDirs) {
          if (dir.isDirectory()) {
            const skillPath = path.join(skillsDir, dir.name, 'SKILL.md');
            if (fs.existsSync(skillPath)) {
              return skillPath;
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load and parse skill configuration from a path or by searching.
 */
export function loadSkillConfig(configPath?: string): {
  config: SkillConfig;
  path: string;
} {
  let skillPath: string | null = null;

  if (configPath) {
    skillPath = path.resolve(configPath);
    if (!fs.existsSync(skillPath)) {
      throw new Error(`Config file not found: ${skillPath}`);
    }
  } else {
    skillPath = findSkillMd();
    if (!skillPath) {
      throw new Error(
        'No SKILL.md found. Create one or use --config to specify path.'
      );
    }
  }

  // Load .env file from SKILL.md directory before parsing
  loadEnvFile(skillPath);

  const content = fs.readFileSync(skillPath, 'utf-8');
  const config = parseSkillMd(content);

  return { config, path: skillPath };
}

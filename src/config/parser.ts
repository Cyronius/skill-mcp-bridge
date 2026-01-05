import matter from 'gray-matter';
import type { SkillConfig, McpServerConfig } from '../types.js';

interface SkillFrontmatter {
  name?: string;
  description?: string;
  'allowed-tools'?: string;
  'mcp-servers'?: Array<{
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

/**
 * Parse SKILL.md content and extract configuration.
 */
export function parseSkillMd(content: string): SkillConfig {
  const { data } = matter(content);
  const frontmatter = data as SkillFrontmatter;

  if (!frontmatter.name) {
    throw new Error('SKILL.md must have a "name" field in frontmatter');
  }

  if (!frontmatter.description) {
    throw new Error('SKILL.md must have a "description" field in frontmatter');
  }

  const mcpServers: McpServerConfig[] = (frontmatter['mcp-servers'] || []).map(
    (server) => {
      if (!server.name) {
        throw new Error('Each mcp-server must have a "name" field');
      }
      if (!server.command) {
        throw new Error(`MCP server "${server.name}" must have a "command" field`);
      }
      return {
        name: server.name,
        command: server.command,
        args: server.args,
        env: server.env,
      };
    }
  );

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    allowedTools: frontmatter['allowed-tools'],
    mcpServers,
  };
}

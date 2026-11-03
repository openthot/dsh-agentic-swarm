/**
 * @file skills-bridge.js
 * Autonomous skills discovery and execution bridge for DSH Agentic Swarm.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export class SkillsBridge {
  /**
   * @param {Object} [options]
   * @param {string[]} [options.skillPaths] - Directories to search for skills
   */
  constructor(options = {}) {
    this.skillPaths = options.skillPaths || [
      resolve(process.cwd(), '.agents/skills'),
      resolve(process.env.HOME || '~', '.agents/skills'),
      resolve(process.env.DSH_HOME || join(process.env.HOME || '', '.dsh'), 'skills')
    ];
    /** @type {Map<string, { name: string, description: string, path: string, instructions: string }>} */
    this.skills = new Map();
    this.discoverSkills();
  }

  /**
   * Scan disk and discover available skill folders and SKILL.md documents.
   */
  discoverSkills() {
    this.skills.clear();
    for (const baseDir of this.skillPaths) {
      if (!existsSync(baseDir)) continue;
      try {
        const entries = readdirSync(baseDir);
        for (const entry of entries) {
          const fullPath = join(baseDir, entry);
          if (statSync(fullPath).isDirectory()) {
            const skillFile = join(fullPath, 'SKILL.md');
            if (existsSync(skillFile)) {
              try {
                const content = readFileSync(skillFile, 'utf8');
                const parsed = parseSkillDoc(entry, content);
                this.skills.set(entry, {
                  name: entry,
                  path: skillFile,
                  description: parsed.description,
                  instructions: parsed.instructions
                });
              } catch (e) {
                // Ignore parse errors on individual skill files
              }
            }
          }
        }
      } catch (e) {
        // Ignore unreadable dirs
      }
    }
    return this.listSkills();
  }

  /**
   * List all discovered skills.
   */
  listSkills() {
    return Array.from(this.skills.values()).map(s => ({
      name: s.name,
      description: s.description,
      path: s.path
    }));
  }

  /**
   * Get full skill instructions by name.
   * @param {string} name
   */
  getSkill(name) {
    return this.skills.get(name) || null;
  }

  /**
   * Find skills matching a search query.
   * @param {string} query
   */
  findSkills(query) {
    const q = (query || '').toLowerCase();
    return this.listSkills().filter(s => 
      s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }

  /**
   * Format skills list for inclusion in system prompt.
   */
  getSkillsPrompt() {
    const list = this.listSkills();
    if (list.length === 0) return 'No local skills discovered.';
    return list.map(s => `- Skill \`${s.name}\`: ${s.description}`).join('\n');
  }
}

/**
 * Helper to extract description and body from a SKILL.md markdown file.
 */
function parseSkillDoc(name, content) {
  let description = `Skill: ${name}`;
  // Check for yaml frontmatter or top lines
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i].trim();
    if (line.toLowerCase().startsWith('description:')) {
      description = line.replace(/description:/i, '').trim();
      break;
    }
    if (line.startsWith('#') && i === 0) {
      description = line.replace(/^#+\s*/, '').trim();
    }
  }

  return {
    description,
    instructions: content
  };
}

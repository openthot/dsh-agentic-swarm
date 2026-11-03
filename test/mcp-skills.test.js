/**
 * @file mcp-skills.test.js
 * Unit tests for MCPBridge and SkillsBridge.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { MCPBridge } from '../lib/mcp-bridge.js';
import { SkillsBridge } from '../lib/skills-bridge.js';

test('MCPBridge registers tools, exposes schemas, and executes autonomously', async () => {
  const bridge = new MCPBridge();

  bridge.registerTool({
    server: 'playwright',
    name: 'browser_click',
    description: 'Click on a web element',
    parameters: {
      type: 'object',
      properties: { selector: { type: 'string' } },
      required: ['selector']
    },
    execute: async (args) => {
      return { clicked: args.selector, status: 200 };
    }
  });

  const tools = bridge.listTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, 'browser_click');
  assert.equal(tools[0].server, 'playwright');

  const promptDef = bridge.getToolPromptDefinitions();
  assert.ok(promptDef.includes('browser_click'));
  assert.ok(promptDef.includes('playwright'));

  // Execution
  const res = await bridge.executeTool('browser_click', { selector: '#submit-btn' });
  assert.equal(res.ok, true);
  assert.equal(res.result.clicked, '#submit-btn');

  // Error handling for missing tool
  const errRes = await bridge.executeTool('non_existent_tool', {});
  assert.equal(errRes.ok, false);
  assert.ok(errRes.error.includes('not registered'));
});

test('SkillsBridge discovers local skills and extracts instructions', () => {
  const bridge = new SkillsBridge();
  const list = bridge.listSkills();

  assert.ok(Array.isArray(list));
  // In this workspace, there are skills like 'agent-experience', 'cordis-styling-nitpicking', etc.
  if (list.length > 0) {
    const first = list[0];
    assert.ok(first.name);
    assert.ok(first.description);

    const full = bridge.getSkill(first.name);
    assert.ok(full.instructions.length > 0);

    const promptText = bridge.getSkillsPrompt();
    assert.ok(promptText.includes(first.name));
  }
});

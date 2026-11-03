/**
 * @file autonomous-loop.test.js
 * Unit tests for AutonomousSwarmLoop (decomposition, tool execution, critic review, self-healing).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { SwarmMessageBus } from '../lib/message-bus.js';
import { SwarmCoordinator } from '../lib/coordinator.js';
import { MCPBridge } from '../lib/mcp-bridge.js';
import { SkillsBridge } from '../lib/skills-bridge.js';
import { AutonomousSwarmLoop } from '../lib/autonomous-loop.js';

test('AutonomousSwarmLoop executes full multi-agent mission with tool execution and verification', async () => {
  const bus = new SwarmMessageBus();
  const coordinator = new SwarmCoordinator({ bus });
  const mcpBridge = new MCPBridge();
  const skillsBridge = new SkillsBridge();

  // Register a mock MCP tool for the swarm to execute
  mcpBridge.registerTool({
    server: 'search-engine',
    name: 'web_search',
    description: 'Search web for docs',
    parameters: { query: { type: 'string' } },
    execute: async (args) => ({ results: [`Doc for ${args.query}`] })
  });

  const progressEvents = [];
  const loop = new AutonomousSwarmLoop({
    coordinator,
    bus,
    mcpBridge,
    skillsBridge,
    maxSteps: 10,
    onProgress: (p) => progressEvents.push(p)
  });

  const missionResult = await loop.runMission({
    goal: 'Build an autonomous agentic swarm plugin'
  });

  assert.equal(missionResult.ok, true);
  assert.ok(missionResult.stepCount >= 3);
  assert.ok(missionResult.finalSynthesis.length > 50);

  // Check metrics on coordinator
  assert.equal(coordinator.metrics.completedMissions, 1);
  assert.ok(coordinator.metrics.totalStepsExecuted >= 3);

  // Check progress sequence
  const phases = progressEvents.map(e => e.phase);
  assert.ok(phases.includes('INIT'));
  assert.ok(phases.includes('PLANNING'));
  assert.ok(phases.includes('EXECUTION'));
  assert.ok(phases.includes('REVIEW'));
  assert.ok(phases.includes('SYNTHESIS'));
  assert.ok(phases.includes('COMPLETE'));

  // Verify blackboard
  const blackboard = bus.getBlackboard();
  assert.equal(blackboard.goal, 'Build an autonomous agentic swarm plugin');
  assert.ok(blackboard.plan);
  assert.ok(blackboard.finalResult);
});

test('AutonomousSwarmLoop triggers self-healing when critic finds defects', async () => {
  const bus = new SwarmMessageBus();
  const coordinator = new SwarmCoordinator({ bus, selfHealing: true, criticReview: true });
  const mcpBridge = new MCPBridge();
  const skillsBridge = new SkillsBridge();

  let reviewCalls = 0;
  // Mock LLM call to simulate a critic review rejection on first pass
  const mockLlm = async (prompt, caller) => {
    if (caller === 'Adversarial Critic') {
      reviewCalls++;
      if (reviewCalls === 1) {
        return JSON.stringify({
          approved: false,
          notes: 'Missing parameter validation in schema'
        });
      }
      return JSON.stringify({ approved: true, notes: 'Fixed' });
    }
    return `Agent ${caller} response`;
  };

  const progressPhases = [];
  const loop = new AutonomousSwarmLoop({
    coordinator,
    bus,
    mcpBridge,
    skillsBridge,
    llmCall: mockLlm,
    onProgress: (p) => progressPhases.push(p.phase)
  });

  const result = await loop.runMission({ goal: 'Validate self-healing' });
  assert.equal(result.ok, true);
  assert.ok(progressPhases.includes('SELF_HEALING'));
  assert.ok(progressPhases.includes('SELF_HEALING_COMPLETE'));
  assert.equal(coordinator.metrics.criticCorrections, 1);
});

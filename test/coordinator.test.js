/**
 * @file coordinator.test.js
 * Unit tests for SwarmCoordinator, SwarmAgent, and SwarmMessageBus.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { SwarmMessageBus } from '../lib/message-bus.js';
import { SwarmAgent, createDefaultSwarmAgents, PRESET_ROLES } from '../lib/agent.js';
import { SwarmCoordinator } from '../lib/coordinator.js';

test('SwarmMessageBus handles messages, channels, and blackboard correctly', () => {
  const bus = new SwarmMessageBus({ maxHistory: 50 });

  // Post message
  const msg1 = bus.postMessage({
    from: 'agent-a',
    to: 'agent-b',
    type: 'TASK_ASSIGN',
    content: 'Please review schema'
  });

  assert.equal(msg1.from, 'agent-a');
  assert.equal(msg1.to, 'agent-b');
  assert.equal(msg1.type, 'TASK_ASSIGN');

  // Direct message helper
  const msg2 = bus.sendDirect('agent-b', 'agent-a', 'Schema looks great!');
  assert.equal(msg2.to, 'agent-a');
  assert.equal(msg2.type, 'DIRECT_MESSAGE');

  // Broadcast helper
  const bMsg = bus.broadcast('coordinator', 'All agents initiate Phase 2');
  assert.equal(bMsg.to, 'all');
  assert.equal(bMsg.type, 'BROADCAST');

  // History filtering
  const allHistory = bus.getHistory();
  assert.equal(allHistory.length, 3);

  const filtered = bus.getHistory({ type: 'TASK_ASSIGN' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].content, 'Please review schema');

  // Blackboard key/value storage
  bus.setBlackboard('targetRepo', 'openthot/dsh-agentic-swarm', 'architect');
  assert.equal(bus.getBlackboard('targetRepo'), 'openthot/dsh-agentic-swarm');

  const fullBlackboard = bus.getBlackboard();
  assert.deepEqual(fullBlackboard, { targetRepo: 'openthot/dsh-agentic-swarm' });
});

test('SwarmAgent models state transitions, metrics, and permissions', () => {
  const agent = new SwarmAgent({
    id: 'specialist-1',
    name: 'Specialist Agent',
    role: 'specialist',
    systemPrompt: 'Do specialized work',
    capabilities: ['code', 'mcp'],
    toolsWhitelist: ['clickup_get_task', 'browser_click']
  });

  assert.equal(agent.status, 'idle');
  assert.equal(agent.canExecuteTool('clickup_get_task'), true);
  assert.equal(agent.canExecuteTool('bash_eval'), false);

  agent.assignTask({ id: 't1', title: 'Fetch task' });
  assert.equal(agent.status, 'working');
  assert.equal(agent.currentTask.id, 't1');

  agent.recordToolUse();
  assert.equal(agent.metrics.toolsExecuted, 1);

  agent.finishTask();
  assert.equal(agent.status, 'completed');
  assert.equal(agent.currentTask, null);
  assert.equal(agent.metrics.tasksCompleted, 1);
});

test('SwarmCoordinator registers default agents and exposes status snapshot', () => {
  const coordinator = new SwarmCoordinator();
  const agents = coordinator.listAgents();

  // Verifies all 6 core preset agents exist
  assert.equal(agents.length, 6);
  const roles = agents.map(a => a.role);
  assert.ok(roles.includes(PRESET_ROLES.COORDINATOR));
  assert.ok(roles.includes(PRESET_ROLES.ARCHITECT));
  assert.ok(roles.includes(PRESET_ROLES.RESEARCHER));
  assert.ok(roles.includes(PRESET_ROLES.CODER));
  assert.ok(roles.includes(PRESET_ROLES.MCP_SPECIALIST));
  assert.ok(roles.includes(PRESET_ROLES.CRITIC));

  const lead = coordinator.getLeadCoordinator();
  assert.equal(lead.role, PRESET_ROLES.COORDINATOR);

  const status = coordinator.status();
  assert.equal(status.queueLength, 0);
  assert.equal(status.agents.length, 6);
  assert.equal(status.metrics.completedMissions, 0);
});

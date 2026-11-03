/**
 * @file telegram.test.js
 * Unit tests for TelegramBotClient command parsing, authorization, and dispatching.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { TelegramBotClient } from '../lib/telegram.js';
import { SwarmCoordinator } from '../lib/coordinator.js';
import { MCPBridge } from '../lib/mcp-bridge.js';
import { SkillsBridge } from '../lib/skills-bridge.js';

test('TelegramBotClient parses commands, checks authorization, and invokes handlers', async () => {
  const coordinator = new SwarmCoordinator();
  const mcpBridge = new MCPBridge();
  const skillsBridge = new SkillsBridge();

  const sentMessages = [];
  const client = new TelegramBotClient({
    botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    allowedUsers: ['12345', 'operator_alice'],
    coordinator,
    mcpBridge,
    skillsBridge
  });

  // Mock sendMessage to intercept outbound messages
  client.sendMessage = async (chatId, text) => {
    sentMessages.push({ chatId, text });
    return { ok: true };
  };

  assert.equal(client.isEnabled(), true);

  // Test unauthorized user
  await client.handleUpdate({
    update_id: 1,
    message: {
      chat: { id: 999 },
      from: { id: 88888, username: 'stranger_bob' },
      text: '/status'
    }
  });

  assert.equal(sentMessages.length, 1);
  assert.ok(sentMessages[0].text.includes('Access Denied'));

  // Test authorized user calling /status
  sentMessages.length = 0;
  await client.handleUpdate({
    update_id: 2,
    message: {
      chat: { id: 100 },
      from: { id: 12345, username: 'operator_alice' },
      text: '/status'
    }
  });

  assert.equal(sentMessages.length, 1);
  assert.ok(sentMessages[0].text.includes('Swarm Live Status'));
  assert.ok(sentMessages[0].text.includes('Lead Coordinator'));

  // Test authorized user calling /help
  sentMessages.length = 0;
  await client.handleUpdate({
    update_id: 3,
    message: {
      chat: { id: 100 },
      from: { id: 12345, username: 'operator_alice' },
      text: '/help'
    }
  });

  assert.equal(sentMessages.length, 1);
  assert.ok(sentMessages[0].text.includes('Hermes Remote Control'));
  assert.ok(sentMessages[0].text.includes('/swarm'));

  // Test broadcast command
  sentMessages.length = 0;
  await client.handleUpdate({
    update_id: 4,
    message: {
      chat: { id: 100 },
      from: { id: 12345, username: 'operator_alice' },
      text: '/broadcast Focus on unit test coverage'
    }
  });

  assert.equal(sentMessages.length, 1);
  assert.ok(sentMessages[0].text.includes('Broadcast sent to Swarm Message Bus'));

  const history = coordinator.bus.getHistory({ type: 'BROADCAST' });
  assert.ok(history.some(h => h.content === 'Focus on unit test coverage'));
});

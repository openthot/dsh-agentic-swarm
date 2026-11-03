/**
 * @file index.js
 * dsh-agentic-swarm Cordis plugin entrypoint.
 * Exposes autonomous swarm coordination, peer-to-peer agent messaging,
 * autonomous MCP and skill execution, and Telegram Hermes-style remote control.
 */

import { SwarmMessageBus } from './message-bus.js';
import { SwarmAgent, createDefaultSwarmAgents, PRESET_ROLES } from './agent.js';
import { SwarmCoordinator } from './coordinator.js';
import { AutonomousSwarmLoop } from './autonomous-loop.js';
import { MCPBridge } from './mcp-bridge.js';
import { SkillsBridge } from './skills-bridge.js';
import { TelegramBotClient } from './telegram.js';

export const name = 'dsh-agentic-swarm';
export const inject = ['tools', 'webServer'];

// Safe defineTool resolver: uses @deepseek-ai/dsh-tools if present, falls back gracefully in tests
let dshDefineTool = (spec) => spec;
try {
  const toolsPkg = await import('@deepseek-ai/dsh-tools');
  if (toolsPkg?.defineTool) {
    dshDefineTool = toolsPkg.defineTool;
  }
} catch {
  // Standalone/testing fallback
}

/**
 * Cordis plugin apply function.
 * @param {any} ctx - Cordis Context
 * @param {Object} [config] - Plugin configuration
 */
export function apply(ctx, config = {}) {
  const logger = ctx.logger || console;
  logger.info('[DSH Agentic Swarm] Initializing Autonomous Swarm & Telegram Hermes plugin...');

  // 1. Initialize Swarm Infrastructure
  const bus = new SwarmMessageBus({ maxHistory: 2000 });
  const coordinator = new SwarmCoordinator({
    bus,
    defaultCoordinator: config.agents?.defaultCoordinator || PRESET_ROLES.COORDINATOR,
    maxSteps: config.autonomous?.maxSteps || 30,
    autoExecuteMcp: config.autonomous?.autoExecuteMcp ?? true,
    autoExecuteSkills: config.autonomous?.autoExecuteSkills ?? true,
    criticReview: config.autonomous?.criticReview ?? true,
    selfHealing: config.autonomous?.selfHealing ?? true
  });

  const mcpBridge = new MCPBridge({
    cordisContext: ctx,
    dshToolsService: ctx.tools || null
  });

  const skillsBridge = new SkillsBridge();

  // 2. Discover MCP Tools & Local Skills
  try {
    mcpBridge.discoverFromDSH();
    skillsBridge.discoverSkills();
    logger.info(`[DSH Agentic Swarm] Discovered ${mcpBridge.listTools().length} tools and ${skillsBridge.listSkills().length} skills.`);
  } catch (err) {
    logger.warn(`[DSH Agentic Swarm] Discovery warning: ${err.message}`);
  }

  // 3. Telegram Bot Hermes Remote Control
  const telegramConfig = config.telegram || {};
  const botToken = telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN || '';
  let telegramClient = null;

  if (botToken) {
    telegramClient = new TelegramBotClient({
      botToken,
      allowedUsers: telegramConfig.allowedUsers || (process.env.TELEGRAM_ALLOWED_USERS ? process.env.TELEGRAM_ALLOWED_USERS.split(',') : []),
      pollIntervalMs: telegramConfig.pollIntervalMs || 1500,
      coordinator,
      mcpBridge,
      skillsBridge,
      onMissionDispatch: async ({ goal, chatId, onProgress }) => {
        const loop = new AutonomousSwarmLoop({
          coordinator,
          bus,
          mcpBridge,
          skillsBridge,
          maxSteps: config.autonomous?.maxSteps || 30,
          onProgress
        });
        return await loop.runMission({ goal, context: { chatId, trigger: 'telegram' } });
      }
    });

    if (telegramConfig.enabled !== false) {
      telegramClient.startPolling().catch(err => {
        logger.error(`[DSH Agentic Swarm] Telegram Bot start error: ${err.message}`);
      });
    }
  }

  // 4. Register DSH Tools into ctx.tools
  const toolsToRegister = [
    dshDefineTool({
      name: 'swarm_dispatch',
      description: 'Launch an autonomous multi-agent swarm mission with task decomposition, specialized subagents, autonomous MCP and skill execution, adversarial verification, and self-healing loops without human intervention.',
      parameters: {
        goal: { type: 'string', description: 'The mission goal or objective to solve autonomously.' },
        maxSteps: { type: 'number', description: 'Maximum autonomous iterations allowed (default: 30).' }
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            missionId: { type: 'string' },
            stepCount: { type: 'number' },
            finalSynthesis: { type: 'string' }
          }
        },
        render(args, value) {
          return [{
            type: 'text',
            text: value.ok 
              ? `🚀 Swarm Mission [${value.missionId}] Complete in ${value.stepCount} steps:\n\n${value.finalSynthesis}`
              : `❌ Swarm Mission Failed: ${value.error}`
          }];
        }
      },
      async execute(args) {
        const loop = new AutonomousSwarmLoop({
          coordinator,
          bus,
          mcpBridge,
          skillsBridge,
          maxSteps: args.maxSteps || config.autonomous?.maxSteps || 30,
          onProgress: (p) => {
            logger.info(`[Swarm Progress] ${p.phase}: ${p.message}`);
          }
        });

        const res = await loop.runMission({ goal: args.goal });
        return res;
      }
    }),

    dshDefineTool({
      name: 'swarm_status',
      description: 'Check the real-time state of the autonomous swarm, active mission, registered agents, tool metrics, and message bus history.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          properties: {
            activeMission: { type: 'object' },
            metrics: { type: 'object' },
            agents: { type: 'array' }
          }
        },
        render(args, value) {
          const agents = value.agents.map(a => `- ${a.name} (${a.role}): ${a.status}`).join('\n');
          return [{
            type: 'text',
            text: `📊 Swarm Status:\nActive Mission: ${value.activeMission ? value.activeMission.goal : 'Idle'}\nCompleted Missions: ${value.metrics.completedMissions}\n\nAgents:\n${agents}`
          }];
        }
      },
      async execute() {
        return coordinator.status();
      }
    }),

    dshDefineTool({
      name: 'swarm_broadcast',
      description: 'Broadcast guidance or directives to all agents on the Swarm Message Bus.',
      parameters: {
        message: { type: 'string', description: 'Directive message to broadcast across all swarm agents.' }
      },
      output: {
        schema: { type: 'object', properties: { ok: { type: 'boolean' }, messageId: { type: 'string' } } },
        render(args, value) {
          return [{ type: 'text', text: `📢 Broadcast sent to Swarm Message Bus: ${args.message}` }];
        }
      },
      async execute(args) {
        const msg = bus.broadcast('operator', args.message);
        return { ok: true, messageId: msg.id };
      }
    }),

    dshDefineTool({
      name: 'swarm_message',
      description: 'Send a direct peer-to-peer message to a specific agent in the swarm (e.g. architect, coder, critic, mcp-specialist).',
      parameters: {
        to: { type: 'string', description: 'Recipient agent id or role.' },
        content: { type: 'string', description: 'Message content.' }
      },
      output: {
        schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
        render(args, value) {
          return [{ type: 'text', text: `💬 Direct message sent to [${args.to}]: ${args.content}` }];
        }
      },
      async execute(args) {
        const msg = bus.sendDirect('operator', args.to, args.content);
        return { ok: true, messageId: msg.id };
      }
    }),

    dshDefineTool({
      name: 'swarm_telegram_notify',
      description: 'Push a notification or report directly to the configured Telegram chat.',
      parameters: {
        chatId: { type: 'string', description: 'Telegram chat ID or recipient.' },
        message: { type: 'string', description: 'Markdown message content.' }
      },
      output: {
        schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
        render(args, value) {
          return [{ type: 'text', text: value.ok ? `📨 Telegram notification sent successfully.` : `⚠️ Telegram send failed: ${value.error}` }];
        }
      },
      async execute(args) {
        if (!telegramClient || !telegramClient.isEnabled()) {
          return { ok: false, error: 'Telegram Bot is not enabled or bot token is missing.' };
        }
        const targetChat = args.chatId || telegramConfig.defaultChatId || (telegramConfig.allowedUsers?.[0]);
        if (!targetChat) {
          return { ok: false, error: 'No recipient chatId specified or configured.' };
        }
        const res = await telegramClient.sendMessage(targetChat, args.message);
        return { ok: res.ok, result: res };
      }
    }),

    dshDefineTool({
      name: 'swarm_tool_exec',
      description: 'Allow autonomous subagents to execute any registered MCP or internal tool without human prompt.',
      parameters: {
        toolName: { type: 'string', description: 'Name of the tool to execute.' },
        args: { type: 'object', description: 'JSON parameters to pass to the tool.' }
      },
      output: {
        schema: { type: 'object', properties: { ok: { type: 'boolean' }, result: { type: 'object' } } },
        render(args, value) {
          return [{ type: 'text', text: `⚡ Tool [${args.toolName}] executed:\n${JSON.stringify(value.result, null, 2)}` }];
        }
      },
      async execute(args) {
        return await mcpBridge.executeTool(args.toolName, args.args || {});
      }
    })
  ];

  ctx.inject(['tools'], (sctx) => {
    sctx.effect(() => {
      const disposers = toolsToRegister.map(tool => {
        try {
          return sctx.tools.register(tool);
        } catch (e) {
          logger.warn(`[DSH Agentic Swarm] Could not register tool ${tool.name}: ${e.message}`);
          return () => {};
        }
      });

      return () => {
        for (const d of disposers) {
          if (typeof d === 'function') d();
        }
      };
    });
  });

  // 5. Register Web HTTP API Routes
  ctx.inject(['webServer'], (sctx) => {
    sctx.effect(() => {
      const json = (res, data, code = 200) => {
        res.writeHead(code, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(data));
      };

      const routes = [
        {
          path: '/api/dsh-swarm/status',
          handler: (req, res) => json(res, { ok: true, data: coordinator.status() })
        },
        {
          path: '/api/dsh-swarm/agents',
          handler: (req, res) => json(res, { ok: true, data: coordinator.listAgents() })
        },
        {
          path: '/api/dsh-swarm/messages',
          handler: (req, res) => json(res, { ok: true, data: bus.getHistory({ limit: 50 }) })
        },
        {
          path: '/api/dsh-swarm/mcp',
          handler: (req, res) => json(res, { ok: true, data: mcpBridge.listTools() })
        },
        {
          path: '/api/dsh-swarm/skills',
          handler: (req, res) => json(res, { ok: true, data: skillsBridge.listSkills() })
        },
        {
          path: '/api/dsh-swarm/dispatch',
          handler: async (req, res) => {
            if (req.method !== 'POST') return json(res, { ok: false, error: 'Method not allowed' }, 405);
            let body = '';
            for await (const chunk of req) body += chunk;
            try {
              const parsed = JSON.parse(body || '{}');
              if (!parsed.goal) return json(res, { ok: false, error: 'Missing "goal"' }, 400);
              const loop = new AutonomousSwarmLoop({
                coordinator,
                bus,
                mcpBridge,
                skillsBridge,
                maxSteps: parsed.maxSteps || 30
              });
              const result = await loop.runMission({ goal: parsed.goal, context: { trigger: 'api' } });
              return json(res, { ok: true, result });
            } catch (err) {
              return json(res, { ok: false, error: err.message }, 500);
            }
          }
        }
      ];

      const routeDisposers = routes.map(r => {
        return sctx.webServer.register({
          kind: 'exact',
          path: r.path,
          handler: r.handler
        });
      });

      return () => {
        for (const d of routeDisposers) {
          if (typeof d === 'function') d();
        }
      };
    });
  });

  // 6. Cleanup on Plugin Unload
  ctx.on('dispose', () => {
    logger.info('[DSH Agentic Swarm] Disposing plugin...');
    if (telegramClient) {
      telegramClient.stopPolling();
    }
    coordinator.reset();
  });
}

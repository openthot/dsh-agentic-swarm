/**
 * @file telegram.js
 * Telegram Bot client and Hermes-style remote control interface for DSH Agentic Swarm.
 * Uses native fetch with long-polling, command routing, and live progress streaming.
 */

export class TelegramBotClient {
  /**
   * @param {Object} options
   * @param {string} options.botToken - Telegram Bot API token
   * @param {Array<string|number>} [options.allowedUsers=[]] - Allowed Telegram user or chat IDs
   * @param {number} [options.pollIntervalMs=1500] - Polling interval
   * @param {import('./coordinator.js').SwarmCoordinator} options.coordinator
   * @param {import('./mcp-bridge.js').MCPBridge} options.mcpBridge
   * @param {import('./skills-bridge.js').SkillsBridge} options.skillsBridge
   * @param {Function} [options.onMissionDispatch] - Handler to execute mission
   */
  constructor(options) {
    this.botToken = options.botToken ? options.botToken.trim() : '';
    this.allowedUsers = (options.allowedUsers || []).map(u => String(u));
    this.pollIntervalMs = options.pollIntervalMs || 1500;
    this.coordinator = options.coordinator;
    this.mcpBridge = options.mcpBridge;
    this.skillsBridge = options.skillsBridge;
    this.onMissionDispatch = options.onMissionDispatch || null;

    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.polling = false;
    this.abortController = null;
    this.lastUpdateId = 0;
    this.activeLoops = new Map(); // chatId -> AutonomousSwarmLoop
  }

  /**
   * Check whether Telegram integration is enabled and has a valid token.
   */
  isEnabled() {
    return Boolean(this.botToken && this.botToken.includes(':'));
  }

  /**
   * Start long-polling in the background.
   */
  async startPolling() {
    if (!this.isEnabled()) return false;
    if (this.polling) return true;

    this.polling = true;
    this.abortController = new AbortController();

    // Verify bot token
    try {
      const me = await this.getMe();
      if (me.ok) {
        console.log(`[DSH Swarm Telegram] Connected as @${me.result.username} (${me.result.first_name})`);
      } else {
        console.error('[DSH Swarm Telegram] getMe failed:', me.description);
        this.polling = false;
        return false;
      }
    } catch (e) {
      console.error('[DSH Swarm Telegram] Connection error:', e.message);
      this.polling = false;
      return false;
    }

    // Start poll loop
    this.runPollLoop().catch(err => {
      console.error('[DSH Swarm Telegram] Poll loop crashed:', err);
    });

    return true;
  }

  /**
   * Stop long-polling.
   */
  stopPolling() {
    this.polling = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Background polling worker.
   */
  async runPollLoop() {
    while (this.polling) {
      try {
        const updates = await this.getUpdates(this.lastUpdateId + 1);
        if (updates.ok && Array.isArray(updates.result)) {
          for (const update of updates.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            await this.handleUpdate(update);
          }
        }
      } catch (err) {
        if (!this.polling) break;
        // Exponential wait on network error
        await new Promise(r => setTimeout(r, 3000));
      }

      if (this.polling) {
        await new Promise(r => setTimeout(r, this.pollIntervalMs));
      }
    }
  }

  /**
   * Fetch updates from Telegram Bot API.
   */
  async getUpdates(offset) {
    const res = await fetch(`${this.apiUrl}/getUpdates?offset=${offset}&timeout=20`, {
      signal: this.abortController?.signal
    });
    return await res.json();
  }

  /**
   * Test bot identity.
   */
  async getMe() {
    const res = await fetch(`${this.apiUrl}/getMe`, {
      signal: this.abortController?.signal
    });
    return await res.json();
  }

  /**
   * Send text message to a chat.
   */
  async sendMessage(chatId, text, options = {}) {
    const body = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parseMode || 'Markdown',
      disable_web_page_preview: true
    };

    try {
      const res = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.ok && data.description?.includes('can\'t parse')) {
        // Fallback to plain text if Markdown parsing fails
        body.parse_mode = undefined;
        await fetch(`${this.apiUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      return data;
    } catch (e) {
      console.error('[DSH Swarm Telegram] Failed to sendMessage:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Process incoming update.
   */
  async handleUpdate(update) {
    const msg = update.message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    const username = msg.from.username || '';
    const text = msg.text.trim();

    // Check authorization
    if (this.allowedUsers.length > 0) {
      const isAllowed = this.allowedUsers.includes(userId) || 
                        (username && this.allowedUsers.includes(username));
      if (!isAllowed) {
        await this.sendMessage(chatId, `⛔ *Access Denied*\nYour Telegram ID (${userId}) is not authorized to operate this DSH Swarm.`);
        return;
      }
    }

    // Command dispatch
    if (text.startsWith('/')) {
      const [cmd, ...args] = text.split(' ');
      const cleanCmd = cmd.toLowerCase().replace(/@.+$/, '');
      const paramStr = args.join(' ');

      switch (cleanCmd) {
        case '/start':
        case '/help':
          await this.cmdHelp(chatId);
          break;
        case '/status':
          await this.cmdStatus(chatId);
          break;
        case '/agents':
          await this.cmdAgents(chatId);
          break;
        case '/mcp':
          await this.cmdMcp(chatId);
          break;
        case '/skills':
          await this.cmdSkills(chatId);
          break;
        case '/swarm':
          await this.cmdSwarm(chatId, paramStr);
          break;
        case '/stop':
        case '/abort':
          await this.cmdAbort(chatId);
          break;
        case '/broadcast':
          await this.cmdBroadcast(chatId, paramStr);
          break;
        default:
          await this.sendMessage(chatId, `❓ Unknown command: \`${cleanCmd}\`. Type /help for available commands.`);
      }
    } else {
      // Natural text input -> trigger autonomous swarm
      await this.cmdSwarm(chatId, text);
    }
  }

  /**
   * /help command
   */
  async cmdHelp(chatId) {
    const text = `🤖 *DeepSeek Harness Swarm & Hermes Remote Control*

Operate your autonomous multi-agent swarm right from Telegram!

*Core Commands:*
🚀 \`/swarm <goal>\` - Launch an autonomous multi-agent mission
📊 \`/status\` - Live swarm status, active agents & metrics
👥 \`/agents\` - View registered agents and specialized personas
⚡ \`/mcp\` - Discover connected MCP servers and tools
🧠 \`/skills\` - View autonomous agent skills
📢 \`/broadcast <msg>\` - Inject guidance to the agent message bus
🛑 \`/stop\` - Abort running swarm mission
❓ \`/help\` - Show this operator guide

💡 *Tip:* Send any direct message to trigger autonomous swarm execution instantly!`;
    await this.sendMessage(chatId, text);
  }

  /**
   * /status command
   */
  async cmdStatus(chatId) {
    const s = this.coordinator.status();
    const active = s.activeMission;
    
    const text = `📊 *Swarm Live Status*

*Active Mission:* ${active ? `\`${active.goal}\` (Step ${active.currentStep})` : '_Idle (No active mission)_'}
*Queue Length:* ${s.queueLength}
*Registered Agents:* ${s.agents.length}

*Cumulative Metrics:*
• Missions Completed: ${s.metrics.completedMissions}
• Total Steps Executed: ${s.metrics.totalStepsExecuted}
• Tools Invoked: ${s.metrics.toolsInvoked}
• Critic Corrections: ${s.metrics.criticCorrections}

*Current Agent States:*
${s.agents.map(a => `• *${a.name}* (${a.role}): \`${a.status.toUpperCase()}\``).join('\n')}`;

    await this.sendMessage(chatId, text);
  }

  /**
   * /agents command
   */
  async cmdAgents(chatId) {
    const agents = this.coordinator.listAgents();
    const text = `👥 *Registered Swarm Agents (${agents.length})*

${agents.map(a => `*${a.name}* [\`${a.role}\`]
• Status: \`${a.status}\`
• Capabilities: ${a.capabilities.map(c => `\`${c}\``).join(', ')}
• Messages Sent: ${a.metrics.messagesSent} | Tools Used: ${a.metrics.toolsExecuted}`).join('\n\n')}`;

    await this.sendMessage(chatId, text);
  }

  /**
   * /mcp command
   */
  async cmdMcp(chatId) {
    const tools = this.mcpBridge ? this.mcpBridge.listTools() : [];
    if (tools.length === 0) {
      await this.sendMessage(chatId, `⚡ *MCP Tools:* No external MCP tools currently discovered.`);
      return;
    }

    const text = `⚡ *Discovered MCP & System Tools (${tools.length})*

${tools.slice(0, 20).map(t => `• \`${t.name}\` [_${t.server}_]: ${t.description.slice(0, 75)}`).join('\n')}
${tools.length > 20 ? `\n_...and ${tools.length - 20} more tools available._` : ''}`;

    await this.sendMessage(chatId, text);
  }

  /**
   * /skills command
   */
  async cmdSkills(chatId) {
    const skills = this.skillsBridge ? this.skillsBridge.listSkills() : [];
    if (skills.length === 0) {
      await this.sendMessage(chatId, `🧠 *Autonomous Skills:* No local skills detected.`);
      return;
    }

    const text = `🧠 *Autonomous Skills Discovered (${skills.length})*

${skills.slice(0, 15).map(s => `• *\`${s.name}\`*: ${s.description.slice(0, 80)}`).join('\n')}`;

    await this.sendMessage(chatId, text);
  }

  /**
   * /broadcast command
   */
  async cmdBroadcast(chatId, message) {
    if (!message) {
      await this.sendMessage(chatId, 'Usage: `/broadcast <message to send to swarm bus>`');
      return;
    }

    this.coordinator.bus.broadcast('operator:telegram', message, { chatId });
    await this.sendMessage(chatId, `📢 *Broadcast sent to Swarm Message Bus:*\n"${message}"`);
  }

  /**
   * /stop command
   */
  async cmdAbort(chatId) {
    const loop = this.activeLoops.get(chatId);
    if (loop) {
      loop.abort();
      this.activeLoops.delete(chatId);
      await this.sendMessage(chatId, '🛑 *Autonomous mission halted per operator command.*');
    } else {
      await this.sendMessage(chatId, 'ℹ️ No running swarm mission found on this channel.');
    }
  }

  /**
   * /swarm or direct mission launch
   */
  async cmdSwarm(chatId, goal) {
    if (!goal || goal.trim().length === 0) {
      await this.sendMessage(chatId, 'Usage: `/swarm <your goal or task>`');
      return;
    }

    await this.sendMessage(chatId, `🚀 *Autonomous Swarm Activated*\n*Goal:* "${goal}"\n_Orchestrating agents and subagents..._`);

    if (this.onMissionDispatch) {
      try {
        const loopInstance = await this.onMissionDispatch({
          goal,
          chatId,
          onProgress: async (p) => {
            if (p.phase === 'PLANNING' || p.phase === 'TOOL_EXEC' || p.phase === 'SELF_HEALING' || p.phase === 'COMPLETE') {
              await this.sendMessage(chatId, `${p.message}`);
            }
          }
        });
        this.activeLoops.set(chatId, loopInstance);
      } catch (e) {
        await this.sendMessage(chatId, `❌ *Swarm Error:* ${e.message}`);
      }
    } else {
      await this.sendMessage(chatId, `⚠️ Mission dispatched to coordinator queue.`);
    }
  }
}

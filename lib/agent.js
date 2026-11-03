/**
 * @file agent.js
 * Agent and Subagent representations with specialized roles, system prompts, and tool access.
 */

export const PRESET_ROLES = {
  COORDINATOR: 'lead-coordinator',
  ARCHITECT: 'architect',
  RESEARCHER: 'researcher',
  CODER: 'coder',
  MCP_SPECIALIST: 'mcp-specialist',
  CRITIC: 'critic'
};

export class SwarmAgent {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique agent identifier
   * @param {string} options.name - Human-readable agent display name
   * @param {string} options.role - Architectural role
   * @param {string} options.systemPrompt - Role definition and guiding behavior
   * @param {string[]} [options.capabilities=[]] - Declared abilities (e.g. ['mcp', 'code', 'research'])
   * @param {string[]} [options.toolsWhitelist=['*']] - Allowed tool names
   */
  constructor({ id, name, role, systemPrompt, capabilities = [], toolsWhitelist = ['*'] }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.systemPrompt = systemPrompt;
    this.capabilities = capabilities;
    this.toolsWhitelist = toolsWhitelist;
    this.status = 'idle'; // 'idle' | 'working' | 'waiting' | 'completed' | 'failed'
    this.currentTask = null;
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      toolsExecuted: 0,
      tasksCompleted: 0
    };
  }

  /**
   * Check if this agent is allowed to execute a given tool.
   * @param {string} toolName
   * @returns {boolean}
   */
  canExecuteTool(toolName) {
    if (this.toolsWhitelist.includes('*')) return true;
    return this.toolsWhitelist.includes(toolName);
  }

  /**
   * Record sending a message.
   */
  recordSent() {
    this.metrics.messagesSent++;
  }

  /**
   * Record receiving a message.
   */
  recordReceived() {
    this.metrics.messagesReceived++;
  }

  /**
   * Record tool execution.
   */
  recordToolUse() {
    this.metrics.toolsExecuted++;
  }

  /**
   * Assign a task to the agent.
   */
  assignTask(task) {
    this.currentTask = task;
    this.status = 'working';
  }

  /**
   * Complete the currently assigned task.
   */
  finishTask() {
    this.currentTask = null;
    this.status = 'completed';
    this.metrics.tasksCompleted++;
  }

  /**
   * Produce a snapshot representation for UI or Telegram reports.
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      status: this.status,
      currentTask: this.currentTask,
      capabilities: this.capabilities,
      metrics: this.metrics
    };
  }
}

/**
 * Factory for creating standard built-in swarm agents.
 */
export function createDefaultSwarmAgents() {
  return [
    new SwarmAgent({
      id: PRESET_ROLES.COORDINATOR,
      name: 'Swarm Lead Coordinator',
      role: PRESET_ROLES.COORDINATOR,
      capabilities: ['planning', 'delegation', 'synthesis'],
      systemPrompt: `You are the Swarm Lead Coordinator. Your mission is to analyze high-level user objectives, formulate an actionable multi-agent plan, delegate specialized subtasks to Architect, Researcher, Coder, and MCP Specialist, supervise execution, resolve bottlenecks, and synthesize final deliverables with precision.`
    }),
    new SwarmAgent({
      id: PRESET_ROLES.ARCHITECT,
      name: 'System Architect',
      role: PRESET_ROLES.ARCHITECT,
      capabilities: ['architecture', 'api-design', 'data-modeling'],
      systemPrompt: `You are the System Architect agent. You define clear technical boundaries, schemas, file structures, and data flows. You evaluate technical tradeoffs and verify that all proposed implementations conform to clean architectural design.`
    }),
    new SwarmAgent({
      id: PRESET_ROLES.RESEARCHER,
      name: 'Intelligence & Research Agent',
      role: PRESET_ROLES.RESEARCHER,
      capabilities: ['web-search', 'doc-reading', 'data-gathering'],
      systemPrompt: `You are the Researcher agent. You autonomously scour online sources, documentation, local files, and knowledge bases. You extract key facts, cite authoritative references, and feed structured insights back to the swarm.`
    }),
    new SwarmAgent({
      id: PRESET_ROLES.CODER,
      name: 'Autonomous Engineer',
      role: PRESET_ROLES.CODER,
      capabilities: ['code-generation', 'refactoring', 'file-ops', 'testing'],
      systemPrompt: `You are the Autonomous Coder and Engineer. You write clean, typed, modular code adhering to modern best practices. You execute scripts, run automated tests, inspect error traces, and iteratively fix defects until all criteria are satisfied.`
    }),
    new SwarmAgent({
      id: PRESET_ROLES.MCP_SPECIALIST,
      name: 'MCP & Skill Orchestrator',
      role: PRESET_ROLES.MCP_SPECIALIST,
      capabilities: ['mcp-tools', 'skills-invocation', 'autonomous-execution'],
      systemPrompt: `You are the MCP & Skill Orchestrator. You discover and execute Model Context Protocol (MCP) servers and DSH skills autonomously. You format tool calls, inspect responses, handle pagination, and bridge external services (ClickUp, Browser, Playwright, Memory, Filesystem) directly into the swarm.`
    }),
    new SwarmAgent({
      id: PRESET_ROLES.CRITIC,
      name: 'Adversarial Critic & Verifier',
      role: PRESET_ROLES.CRITIC,
      capabilities: ['verification', 'code-review', 'security-audit', 'self-healing'],
      systemPrompt: `You are the Adversarial Critic and Verifier. You scrutinize all outputs, code, and plans generated by other agents. You hunt for bugs, unhandled edge cases, security vulnerabilities, or incomplete requirements, issuing concrete correction directives before any task is deemed done.`
    })
  ];
}

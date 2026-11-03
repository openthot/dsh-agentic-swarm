/**
 * @file coordinator.js
 * SwarmCoordinator - orchestrates multi-agent tasks, task queue, blackboard, and execution cycles.
 */

import { createDefaultSwarmAgents, SwarmAgent, PRESET_ROLES } from './agent.js';
import { SwarmMessageBus } from './message-bus.js';

export class SwarmCoordinator {
  /**
   * @param {Object} [options]
   * @param {SwarmMessageBus} [options.bus]
   * @param {SwarmAgent[]} [options.agents]
   * @param {string} [options.defaultCoordinator='lead-coordinator']
   * @param {number} [options.maxSteps=30]
   */
  constructor(options = {}) {
    this.bus = options.bus || new SwarmMessageBus({ maxHistory: 1000 });
    this.agents = new Map(); // id -> SwarmAgent
    this.taskQueue = [];
    this.activeMission = null;
    this.config = {
      defaultCoordinator: options.defaultCoordinator || PRESET_ROLES.COORDINATOR,
      maxSteps: options.maxSteps || 30,
      autoExecuteMcp: options.autoExecuteMcp ?? true,
      autoExecuteSkills: options.autoExecuteSkills ?? true,
      criticReview: options.criticReview ?? true,
      selfHealing: options.selfHealing ?? true,
      ...options
    };

    // Register initial agents
    const initialAgents = options.agents || createDefaultSwarmAgents();
    for (const agent of initialAgents) {
      this.registerAgent(agent);
    }

    this.metrics = {
      totalMissions: 0,
      completedMissions: 0,
      failedMissions: 0,
      totalStepsExecuted: 0,
      criticCorrections: 0,
      toolsInvoked: 0
    };
  }

  /**
   * Register an agent into the coordinator's registry.
   * @param {SwarmAgent} agent
   */
  registerAgent(agent) {
    if (!(agent instanceof SwarmAgent)) {
      throw new Error('agent must be an instance of SwarmAgent');
    }
    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * Unregister an agent.
   * @param {string} agentId
   */
  unregisterAgent(agentId) {
    return this.agents.delete(agentId);
  }

  /**
   * Get an agent by ID.
   * @param {string} agentId
   * @returns {SwarmAgent|null}
   */
  getAgent(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * List all registered agents.
   */
  listAgents() {
    return Array.from(this.agents.values()).map(a => a.toJSON());
  }

  /**
   * Get the active Coordinator / Leader agent.
   */
  getLeadCoordinator() {
    return this.agents.get(this.config.defaultCoordinator) || null;
  }

  /**
   * Get complete status snapshot of the swarm.
   */
  status() {
    return {
      activeMission: this.activeMission,
      queueLength: this.taskQueue.length,
      metrics: this.metrics,
      agents: this.listAgents(),
      blackboard: this.bus.getBlackboard(),
      recentMessages: this.bus.getHistory({ limit: 20 })
    };
  }

  /**
   * Enqueue and trigger a new swarm mission.
   * @param {Object} mission
   * @param {string} mission.id
   * @param {string} mission.goal
   * @param {string} [mission.source='operator']
   * @param {Record<string, any>} [mission.context]
   */
  enqueueMission(mission) {
    const item = {
      id: mission.id || `mission_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      goal: mission.goal,
      source: mission.source || 'operator',
      context: mission.context || {},
      status: 'pending',
      createdAt: Date.now(),
      steps: [],
      finalResult: null
    };

    this.taskQueue.push(item);
    this.bus.broadcast('coordinator', `New mission queued: "${item.goal}"`, { missionId: item.id });
    return item;
  }

  /**
   * Clear all missions and reset state.
   */
  reset() {
    this.taskQueue = [];
    this.activeMission = null;
    this.bus.clear();
    for (const agent of this.agents.values()) {
      agent.status = 'idle';
      agent.currentTask = null;
    }
  }
}

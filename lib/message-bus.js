/**
 * @file SwarmMessageBus.js
 * Inter-agent communication bus, shared blackboard, and event routing for DSH Agentic Swarm.
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

export class SwarmMessageBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxHistory = options.maxHistory || 1000;
    /** @type {Array<any>} */
    this.history = [];
    /** @type {Map<string, { value: any, updatedBy: string, updatedAt: number }>} */
    this.blackboard = new Map();
  }

  /**
   * Post a structured message to the swarm.
   * @param {Object} msg
   * @param {string} msg.from - Sender identifier
   * @param {string} [msg.to='all'] - Recipient ('all', specific agent id, or 'operator')
   * @param {string} [msg.type='MESSAGE'] - Message category
   * @param {string} msg.content - Textual or structured content
   * @param {Record<string, any>} [msg.metadata] - Optional arbitrary payload
   * @returns {Object} Complete recorded message
   */
  postMessage({ from, to = 'all', type = 'MESSAGE', content, metadata = {} }) {
    if (!from || typeof content !== 'string') {
      throw new Error('Message must include valid "from" and string "content"');
    }

    const message = {
      id: `msg_${randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
      from,
      to,
      type,
      content,
      metadata
    };

    this.history.push(message);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit generalized and specific channel events
    this.emit('message', message);
    if (to === 'all') {
      this.emit('broadcast', message);
    } else {
      this.emit(`direct:${to}`, message);
    }
    this.emit(`type:${type}`, message);

    return message;
  }

  /**
   * Send a direct peer-to-peer message between two agents.
   */
  sendDirect(from, to, content, metadata = {}) {
    return this.postMessage({ from, to, type: 'DIRECT_MESSAGE', content, metadata });
  }

  /**
   * Broadcast a message to the entire swarm.
   */
  broadcast(from, content, metadata = {}) {
    return this.postMessage({ from, to: 'all', type: 'BROADCAST', content, metadata });
  }

  /**
   * Post a tool execution request or report.
   */
  postToolEvent(from, toolName, args, result = null, error = null) {
    return this.postMessage({
      from,
      to: 'all',
      type: result || error ? 'TOOL_RESULT' : 'TOOL_CALL',
      content: result 
        ? `Executed tool [${toolName}] successfully.` 
        : error 
        ? `Tool [${toolName}] failed: ${error}` 
        : `Requesting execution of tool [${toolName}]`,
      metadata: { toolName, args, result, error }
    });
  }

  /**
   * Store or update an item on the shared Swarm Blackboard.
   */
  setBlackboard(key, value, updatedBy = 'system') {
    this.blackboard.set(key, {
      value,
      updatedBy,
      updatedAt: Date.now()
    });
    this.emit('blackboard:update', { key, value, updatedBy });
  }

  /**
   * Retrieve an item from the shared Swarm Blackboard.
   */
  getBlackboard(key) {
    if (key) {
      return this.blackboard.get(key)?.value ?? null;
    }
    // Return all blackboard keys and values
    const snapshot = {};
    for (const [k, v] of this.blackboard.entries()) {
      snapshot[k] = v.value;
    }
    return snapshot;
  }

  /**
   * Get filtered history of messages.
   */
  getHistory(filter = {}) {
    let list = [...this.history];
    if (filter.from) list = list.filter(m => m.from === filter.from);
    if (filter.to) list = list.filter(m => m.to === filter.to || m.to === 'all');
    if (filter.type) list = list.filter(m => m.type === filter.type);
    if (filter.since) list = list.filter(m => m.timestamp >= filter.since);
    if (filter.limit && filter.limit > 0) {
      list = list.slice(-filter.limit);
    }
    return list;
  }

  /**
   * Clear in-memory history and blackboard (useful for test resets).
   */
  clear() {
    this.history = [];
    this.blackboard.clear();
    this.emit('clear');
  }
}

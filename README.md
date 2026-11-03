# 🐝 DSH Agentic Swarm & Telegram Hermes Remote Control

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: DeepSeek Harness](https://img.shields.io/badge/Platform-DeepSeek_Harness_0.2.1-purple.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![Hermes Protocol](https://img.shields.io/badge/Remote_Control-Telegram_Hermes-0088cc.svg)](https://telegram.org)
[![MCP Ready](https://img.shields.io/badge/Tools-MCP_&_Skills_Autonomous-success.svg)](https://modelcontextprotocol.io)

An autonomous multi-agent swarm orchestrator and Telegram Hermes-style remote control plugin for **DeepSeek Harness (DSH)**.

Coordinate specialized agents and subagents that communicate with each other in real-time, share memory on a decentralized blackboard, autonomously discover and execute Model Context Protocol (MCP) tools and skills without human intervention, and perform self-healing adversarial code verification.

---

## 🌟 Key Capabilities

### 1. 🤖 Hierarchical & Peer-to-Peer Agent Swarm
- **Lead Coordinator**: Decomposes high-level objectives into prioritized subtasks, supervises progress, and compiles final deliverables.
- **System Architect**: Defines structural boundaries, interface contracts, and system invariant constraints.
- **Intelligence & Researcher**: Autonomously retrieves external documentation, web data, and domain context.
- **Autonomous Coder**: Implements logic, runs scripts, writes tests, and resolves technical bottlenecks.
- **MCP & Skill Specialist**: Auto-discovers and drives external Model Context Protocol (MCP) servers and DSH skills without human intervention.
- **Adversarial Critic & Verifier**: Rigorously inspects agent outputs for bugs, security vulnerabilities, or incomplete requirements, triggering automated self-healing loops.

### 2. ⚡ Inter-Agent Communication & Shared Blackboard
- **SwarmMessageBus**: Real-time message bus supporting direct agent-to-agent (P2P) dialogs, swarm-wide broadcasts, and audit logs.
- **Decentralized Blackboard**: Global key-value state store allowing subagents to read and write intermediate schemas, credentials, and artifacts as tasks progress.

### 3. 🧠 Autonomous MCP & Skill Execution
- Agents inspect connected MCP servers (ClickUp, Playwright, Memory, Filesystem, Fetch, custom servers) dynamically.
- Automatically selects and calls relevant tools without needing user prompts or manual approval.
- Dynamically loads skill procedures from `.agents/skills` or `~/.dsh/skills`.

### 4. 📱 Hermes-Style Telegram Remote Control
- Full conversational control over your DSH agent directly from Telegram!
- Built with zero-dependency native fetch and reliable long-polling (no webhooks or public ports required).
- Interactive commands:
  - `/swarm <goal>`: Launch an autonomous swarm mission with live step progress streaming.
  - `/status`: Live dashboard of active missions, registered agents, and execution metrics.
  - `/agents`: Inspect individual agent states, capabilities, and message counters.
  - `/mcp`: List connected MCP tools and servers.
  - `/skills`: List discovered agent skills.
  - `/broadcast <msg>`: Inject operator guidance into the swarm message bus.
  - `/stop`: Immediate emergency stop of running swarm missions.
  - *Natural Language*: Any plain text message triggers autonomous swarm resolution.

### 5. 🔄 Adversarial Verification & Self-Healing
- Every swarm mission automatically passes through an adversarial verification stage.
- If defects or omissions are identified, the Critic dispatches concrete remediation instructions, initiating a self-healing loop until the deliverable is validated.

---

## 🏗️ Architecture

```
                                  +-----------------------------+
                                  |   Operator / Telegram Bot   |
                                  |   (Hermes-Style Control)    |
                                  +--------------+--------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |    Swarm Lead Coordinator   |
                                  +--------------+--------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   |                             |                             |
                   v                             v                             v
       +-----------------------+     +-----------------------+     +-----------------------+
       |   System Architect    |     |   Intelligence/Search |     |   Autonomous Coder    |
       +-----------+-----------+     +-----------+-----------+     +-----------+-----------+
                   |                             |                             |
                   +-----------------------------+-----------------------------+
                                                 |
                                  +--------------v--------------+
                                  |    Swarm Message Bus &      |
                                  |    Shared Blackboard        |
                                  +--------------+--------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   |                                                           |
                   v                                                           v
       +-----------------------+                                   +-----------------------+
       |   MCP & Skill Bridge  |                                   |  Adversarial Critic   |
       |  (Zero Intervention)  |                                   |     & Self-Healing    |
       +-----------+-----------+                                   +-----------+-----------+
                   |                                                           |
     +-------------+-------------+                                             |
     |             |             |                                             |
     v             v             v                                             v
[ClickUp]    [Playwright]   [Skills...]                                 [Verified Delivery]
```

---

## 🚀 Quick Start & Installation

### Step 1: Install in DSH Profile
Add `dsh-agentic-swarm` to your DSH web profile (`~/.dsh/profiles/web/package.json`):

```json
{
  "dependencies": {
    "dsh-agentic-swarm": "file:/path/to/dsh-agentic-swarm"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "dsh-agentic-swarm"
      ]
    }
  }
}
```

Or install via pnpm inside `~/.dsh/profiles/web`:
```bash
cd ~/.dsh/profiles/web
pnpm add file:/Users/apple/Documents/deepseek-harness/default-workspace/dsh-agentic-swarm
```

### Step 2: Configure in `cordis.patch.yml`
Add the configuration patch to `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: agentic-swarm
      name: "dsh-agentic-swarm"
      config:
        telegram:
          enabled: true
          botToken: "YOUR_TELEGRAM_BOT_TOKEN"
          allowedUsers: ["YOUR_TELEGRAM_USER_ID"]
          pollIntervalMs: 1500
        autonomous:
          maxSteps: 30
          autoExecuteMcp: true
          autoExecuteSkills: true
          criticReview: true
          selfHealing: true
        agents:
          defaultCoordinator: "lead-coordinator"
```

### Step 3: Run DSH Web
```bash
dsh web
```
The plugin will activate, connect to Telegram (if token provided), register DSH tools, and mount HTTP management endpoints on `http://127.0.0.1:3080`.

---

## 🛠️ DSH Tools Reference

When installed, `dsh-agentic-swarm` registers the following model-facing tools:

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `swarm_dispatch` | `goal` (string), `maxSteps` (number) | Launches an autonomous multi-agent mission with step-by-step progress and final synthesis. |
| `swarm_status` | _none_ | Returns live snapshot of active missions, registered agents, metrics, and message bus history. |
| `swarm_broadcast` | `message` (string) | Injects guidance or directives across all agents on the swarm message bus. |
| `swarm_message` | `to` (string), `content` (string) | Sends a direct peer-to-peer message to a specific agent in the swarm. |
| `swarm_telegram_notify` | `chatId` (string), `message` (string) | Pushes an update or prompt directly to the operator on Telegram. |
| `swarm_tool_exec` | `toolName` (string), `args` (object) | Allows autonomous subagents to execute registered MCP or system tools without human prompt. |

---

## 🌐 REST API Endpoints

The plugin exposes lightweight JSON endpoints on the DSH Web server:

- `GET /api/dsh-swarm/status` - Live swarm state, queue length, and metrics.
- `GET /api/dsh-swarm/agents` - Detailed list of registered agents and their current tasks.
- `GET /api/dsh-swarm/messages` - Recent audit log from the Swarm Message Bus.
- `GET /api/dsh-swarm/mcp` - All discovered MCP tools and schemas.
- `GET /api/dsh-swarm/skills` - All discovered local skills.
- `POST /api/dsh-swarm/dispatch` - Programmatically launch a mission (`{"goal": "..."}`).

---

## 🧪 Running Tests

The test suite runs with Node's native test runner (`node --test`):

```bash
cd dsh-agentic-swarm
pnpm test
# or
node --test test/*.test.js
```

---

## 📄 License

MIT License. Developed for DeepSeek Harness by [openthot](https://github.com/openthot).

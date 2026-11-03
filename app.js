/**
 * DSH Agentic Swarm - Showcase Interactive Script
 * Apple Aesthetics • Topology Visualizer • Hermes Telegram Simulator
 */

document.addEventListener('DOMContentLoaded', () => {
  initTopologyVisualizer();
  initTelegramSimulator();
  initCopyButtons();
});

// -------------------------------------------------------------
// 1. Swarm Topology Visualizer
// -------------------------------------------------------------
const AGENTS_DATA = {
  coordinator: {
    name: 'Swarm Lead Coordinator',
    role: 'lead-coordinator',
    status: 'ACTIVE • SUPERVISING',
    capabilities: ['Dynamic Planning', 'Subtask Delegation', 'Synthesis'],
    prompt: 'Analyzes high-level objectives, decomposes missions into prioritized subtasks, supervises specialist progress, and synthesizes verified deliverables.'
  },
  architect: {
    name: 'System Architect',
    role: 'architect',
    status: 'IDLE • READY',
    capabilities: ['Architecture Design', 'API Contracts', 'Invariants'],
    prompt: 'Defines clean technical boundaries, interface contracts, and data structures. Ensures system compliance with strict architectural standards.'
  },
  researcher: {
    name: 'Intelligence & Research',
    role: 'researcher',
    status: 'IDLE • READY',
    capabilities: ['Autonomous Web Search', 'Doc Reading', 'Intelligence'],
    prompt: 'Autonomously gathers authoritative intelligence, parses documentation, verifies external schemas, and supplies real-time context to the swarm.'
  },
  mcp: {
    name: 'MCP & Skill Orchestrator',
    role: 'mcp-specialist',
    status: 'ACTIVE • EXECUTING TOOLS',
    capabilities: ['MCP Discovery', 'Tool Calling', 'Skills Invocation'],
    prompt: 'Directly interfaces with Model Context Protocol (MCP) servers (Playwright, ClickUp, Memory, Filesystem) and DSH skills without human intervention.'
  },
  coder: {
    name: 'Autonomous Engineer',
    role: 'coder',
    status: 'WORKING • REFACTORING',
    capabilities: ['Code Generation', 'Automated Testing', 'File Ops'],
    prompt: 'Writes clean, modular code, runs automated test suites, inspects error traces, and refactors components until all invariants pass.'
  },
  critic: {
    name: 'Adversarial Critic & Verifier',
    role: 'critic',
    status: 'ACTIVE • SELF-HEALING',
    capabilities: ['Adversarial Review', 'Security Audit', 'Self-Healing'],
    prompt: 'Rigorously inspects agent outputs for bugs, performance bottlenecks, and security oversights. Triggers automated self-healing loops upon detecting defects.'
  }
};

function initTopologyVisualizer() {
  const nodes = document.querySelectorAll('.agent-node');
  const inspectorTitle = document.getElementById('inspector-title');
  const inspectorStatus = document.getElementById('inspector-status');
  const inspectorPrompt = document.getElementById('inspector-prompt');
  const inspectorCaps = document.getElementById('inspector-caps');

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      const agentKey = node.getAttribute('data-agent');
      const data = AGENTS_DATA[agentKey];
      if (!data) return;

      inspectorTitle.textContent = data.name;
      inspectorStatus.innerHTML = `<span class="dot"></span> ${data.status}`;
      inspectorPrompt.textContent = data.prompt;
      inspectorCaps.innerHTML = data.capabilities.map(c => `<span class="card-badge badge-blue">${c}</span>`).join(' ');
    });
  });
}

// -------------------------------------------------------------
// 2. Hermes Telegram Bot Simulator
// -------------------------------------------------------------
function initTelegramSimulator() {
  const body = document.getElementById('tg-body');
  const input = document.getElementById('tg-input');
  const sendBtn = document.getElementById('tg-send-btn');
  const chips = document.querySelectorAll('.tg-chip');

  function appendMessage(sender, text, isOut = false) {
    const msg = document.createElement('div');
    msg.className = `tg-msg ${isOut ? 'tg-msg-out' : 'tg-msg-in'}`;
    
    if (!isOut) {
      const header = document.createElement('div');
      header.className = 'tg-msg-header';
      header.textContent = sender;
      msg.appendChild(header);
    }

    const content = document.createElement('div');
    content.innerHTML = formatMarkdown(text);
    msg.appendChild(content);

    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function handleSend(userText) {
    const text = userText || input.value.trim();
    if (!text) return;
    input.value = '';

    appendMessage('You', text, true);

    // Simulate typing & autonomous response
    setTimeout(() => {
      respondToCommand(text);
    }, 600);
  }

  function respondToCommand(rawText) {
    const text = rawText.trim();
    const lower = text.toLowerCase();

    if (lower === '/help' || lower === '/start') {
      appendMessage('Hermes Swarm Bot', `🤖 <b>DeepSeek Harness Swarm & Hermes Remote Control</b><br><br>
Available commands:<br>
• <code>/swarm &lt;goal&gt;</code> - Launch autonomous multi-agent swarm<br>
• <code>/status</code> - Live swarm state & metrics<br>
• <code>/agents</code> - Registered agents & status<br>
• <code>/mcp</code> - List discovered MCP tools<br>
• <code>/skills</code> - List autonomous skills<br>
• <code>/broadcast &lt;msg&gt;</code> - Message the swarm bus<br>
• <code>/stop</code> - Abort active mission`);
    } else if (lower === '/status') {
      appendMessage('Hermes Swarm Bot', `📊 <b>Swarm Live Status</b><br><br>
• <b>Active Mission:</b> <code>Autonomous Task</code><br>
• <b>Registered Agents:</b> 6 active<br>
• <b>Completed Missions:</b> 42<br>
• <b>Critic Approvals:</b> 98.4%<br>
• <b>MCP Tools Active:</b> 28`);
    } else if (lower === '/mcp') {
      appendMessage('Hermes Swarm Bot', `⚡ <b>Discovered MCP Tools (Autonomous Mode)</b><br><br>
• <code>clickup_create_task</code> [ClickUp Server]<br>
• <code>playwright_browser_click</code> [Browser Server]<br>
• <code>memory_add_observations</code> [Memory Graph]<br>
• <code>fs_read_file</code> [Filesystem]<br>
• <code>web_search_parallel</code> [Deep Search]`);
    } else if (lower === '/agents') {
      appendMessage('Hermes Swarm Bot', `👥 <b>Active Swarm Agents</b><br><br>
1. <b>Lead Coordinator</b> [ACTIVE]<br>
2. <b>System Architect</b> [READY]<br>
3. <b>Intelligence Researcher</b> [READY]<br>
4. <b>Autonomous Coder</b> [WORKING]<br>
5. <b>MCP & Skill Orchestrator</b> [ACTIVE]<br>
6. <b>Adversarial Critic</b> [VERIFYING]`);
    } else {
      // Swarm mission execution simulation
      const missionGoal = text.replace(/^\/swarm\s*/i, '');
      simulateAutonomousMission(missionGoal);
    }
  }

  function simulateAutonomousMission(goal) {
    appendMessage('Hermes Swarm Bot', `🚀 <b>Swarm Mission Activated:</b> "${goal}"<br><i>Lead Coordinator formulating plan...</i>`);

    setTimeout(() => {
      appendMessage('Swarm Lead Coordinator', `📋 <b>Plan Established (4 Subtasks):</b><br>
1. [Architect] Define modular contracts<br>
2. [Researcher] Retrieve context & schemas<br>
3. [MCP Specialist] Invoke necessary MCP tools<br>
4. [Coder] Implement logic & tests`);
    }, 1200);

    setTimeout(() => {
      appendMessage('MCP & Skill Orchestrator', `⚡ <i>Autonomously invoking MCP tool <code>mcp_fetch_data</code> without user intervention...</i><br>✅ Tool executed successfully (HTTP 200 OK).`);
    }, 2400);

    setTimeout(() => {
      appendMessage('Adversarial Critic', `🔍 <b>Adversarial Verification:</b><br>
Reviewing deliverables against criteria...<br>
✅ Invariants preserved<br>
✅ Zero security flaws<br>
<b>VERDICT: APPROVED ✅</b>`);
    }, 3600);

    setTimeout(() => {
      appendMessage('Hermes Swarm Bot', `🏁 <b>Swarm Mission Completed Successfully!</b><br><br>
All subtasks resolved, validated by Critic, and synchronized with DSH Web blackboard.`);
    }, 4800);
  }

  sendBtn.addEventListener('click', () => handleSend());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-cmd') || chip.textContent;
      handleSend(text);
    });
  });
}

function formatMarkdown(text) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// -------------------------------------------------------------
// 3. One-Click Copy Buttons
// -------------------------------------------------------------
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy');
      const targetEl = document.getElementById(targetId);
      const text = targetEl ? targetEl.textContent : btn.getAttribute('data-text');

      if (text) {
        navigator.clipboard.writeText(text.trim()).then(() => {
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          btn.style.color = '#30D158';
          setTimeout(() => {
            btn.textContent = original;
            btn.style.color = '';
          }, 2000);
        });
      }
    });
  });
}

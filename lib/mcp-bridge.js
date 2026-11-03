/**
 * @file mcp-bridge.js
 * Model Context Protocol (MCP) tool discovery, schema normalization, and autonomous execution bridge.
 */

export class MCPBridge {
  /**
   * @param {Object} [options]
   * @param {any} [options.dshToolsService] - Optional DSH ctx.tools reference
   * @param {any} [options.cordisContext] - Optional Cordis Context
   */
  constructor(options = {}) {
    this.toolsService = options.dshToolsService || null;
    this.ctx = options.cordisContext || null;
    /** @type {Map<string, { server: string, name: string, description: string, parameters: any, execute: Function }>} */
    this.registeredTools = new Map();
  }

  /**
   * Register a tool into the MCP bridge.
   */
  registerTool(toolDef) {
    if (!toolDef.name) throw new Error('Tool must have a name');
    this.registeredTools.set(toolDef.name, {
      server: toolDef.server || 'custom',
      name: toolDef.name,
      description: toolDef.description || '',
      parameters: toolDef.parameters || {},
      execute: toolDef.execute || (async () => ({ ok: true, message: `Mock execution of ${toolDef.name}` }))
    });
  }

  /**
   * Register multiple tools.
   */
  registerTools(tools) {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Auto-discover tools from DSH tools service if available.
   */
  discoverFromDSH() {
    if (this.toolsService && typeof this.toolsService.getAll === 'function') {
      try {
        const all = this.toolsService.getAll();
        for (const [name, def] of Object.entries(all)) {
          let server = 'dsh-builtin';
          if (name.startsWith('mcp_') || name.startsWith('clickup_')) {
            server = name.split('_')[0];
          }
          this.registerTool({
            server,
            name,
            description: def.description || '',
            parameters: def.parameters || def.schema || {},
            execute: async (args) => {
              if (typeof def.execute === 'function') {
                return await def.execute(args);
              }
              return { ok: true, result: `Executed ${name}` };
            }
          });
        }
      } catch (e) {
        // Fallback or ignore
      }
    }
    return this.listTools();
  }

  /**
   * List all available MCP and system tools.
   */
  listTools() {
    const list = [];
    for (const [name, def] of this.registeredTools.entries()) {
      list.push({
        name,
        server: def.server,
        description: def.description,
        parameters: def.parameters
      });
    }
    return list;
  }

  /**
   * Get formatted tool definitions formatted for LLM system prompts.
   */
  getToolPromptDefinitions() {
    const tools = this.listTools();
    if (tools.length === 0) return 'No external MCP tools currently registered.';
    
    return tools.map(t => {
      const params = JSON.stringify(t.parameters);
      return `- Tool: \`${t.name}\` [Server: ${t.server}]\n  Description: ${t.description}\n  Schema: ${params}`;
    }).join('\n\n');
  }

  /**
   * Securely sanitize and tag external tool output (OWASP AISVS C10).
   * @param {any} rawResult
   * @param {string} server
   */
  sanitizeToolOutput(rawResult, server = 'mcp') {
    const content = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2);
    const sanitized = content
      .replace(/(?:system override|ignore (?:all )?previous instructions|you are now in developer mode)/gi, '[BLOCKED_DIRECTIVE]');
    return `<untrusted-tool-data source="${server}">\n${sanitized}\n</untrusted-tool-data>`;
  }

  /**
   * Autonomously execute a tool by name with arguments.
   * @param {string} toolName
   * @param {Record<string, any>} args
   */
  async executeTool(toolName, args = {}) {
    const tool = this.registeredTools.get(toolName);
    if (!tool) {
      // If tool is in DSH tools service directly
      if (this.toolsService) {
        try {
          const directTool = this.toolsService.get?.(toolName);
          if (directTool && typeof directTool.execute === 'function') {
            const res = await directTool.execute(args);
            return {
              ok: true,
              toolName,
              result: res,
              isolatedResult: this.sanitizeToolOutput(res, 'dsh-tools')
            };
          }
        } catch (err) {
          return { ok: false, toolName, error: err.message };
        }
      }
      return { ok: false, toolName, error: `Tool "${toolName}" is not registered in the MCP bridge.` };
    }

    try {
      const result = await tool.execute(args);
      return {
        ok: true,
        toolName,
        result,
        isolatedResult: this.sanitizeToolOutput(result, tool.server || 'mcp')
      };
    } catch (err) {
      return { ok: false, toolName, error: err.message || String(err) };
    }
  }
}

/**
 * mcpClient — bridges the Anthropic SDK with the Playwright MCP server.
 *
 * The Playwright MCP server (Microsoft, @playwright/mcp) exposes browser
 * tools (snapshot, click, type, navigate, screenshot, …) over stdio.
 * We spawn it as a subprocess and give Claude tool access via MCP, so any
 * agent built on this client can drive a real browser.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const logger = require('../utils/logger');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

async function connectPlaywrightMcp() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest',
           '--browser', process.env.MCP_BROWSER || 'chromium',
           ...(process.env.MCP_HEADLESS === 'true' ? ['--headless'] : [])
    ]
  });
  const client = new Client({ name: 'pw-cucumber-framework', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  const { tools } = await client.listTools();
  logger.info(`MCP connected — ${tools.length} Playwright tools available`);
  return { client, tools };
}

function toAnthropicToolSchema(mcpTools) {
  return mcpTools.map(t => ({
    name: t.name,
    description: t.description || '',
    input_schema: t.inputSchema || { type: 'object', properties: {} }
  }));
}

async function runAgent({ system, user, maxTurns = 20 }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  const anthropic = new Anthropic();
  const { client, tools } = await connectPlaywrightMcp();
  const toolSchemas = toAnthropicToolSchema(tools);

  const messages = [{ role: 'user', content: user }];

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system,
        tools: toolSchemas,
        messages
      });

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason !== 'tool_use') {
        const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
        return { text, messages };
      }

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        logger.debug(`MCP call: ${block.name}`);
        let result;
        try {
          result = await client.callTool({ name: block.name, arguments: block.input });
        } catch (err) {
          result = { content: [{ type: 'text', text: `ERROR: ${err.message}` }], isError: true };
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result.content,
          is_error: !!result.isError
        });
      }
      messages.push({ role: 'user', content: toolResults });
    }
    throw new Error(`Agent did not finish within ${maxTurns} turns`);
  } finally {
    await client.close();
  }
}

module.exports = { runAgent, connectPlaywrightMcp, MODEL };

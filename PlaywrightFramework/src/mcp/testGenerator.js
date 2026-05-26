#!/usr/bin/env node
/**
 * testGenerator — agent that produces feature files + step skeletons + locators
 * for a given URL or user story, using the Playwright MCP browser tools to
 * actually explore the app.
 *
 * Usage:
 *   node src/mcp/testGenerator.js --url https://example.com/login
 *   node src/mcp/testGenerator.js --story ./input/checkout-story.md
 */
const fs = require('fs');
const path = require('path');
const { runAgent } = require('./mcpClient');
const logger = require('../utils/logger');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
  return args;
}

function loadPrompt() {
  return fs.readFileSync(path.join(__dirname, 'prompts', 'generate-feature.md'), 'utf8');
}

function extractBlocks(text) {
  const re = /```(\w+)\s+name=([^\n]+)\n([\s\S]*?)```/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push({ lang: m[1], file: m[2].trim(), body: m[3] });
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.url && !args.story) {
    console.error('Provide --url <url> or --story <file>');
    process.exit(1);
  }

  const userMsg = args.url
    ? `Target URL: ${args.url}\nExplore the page and produce a Cucumber feature for the primary user flow plus 2 negative scenarios.`
    : `User story:\n\n${fs.readFileSync(args.story, 'utf8')}`;

  logger.info('Running test generator agent…');
  const { text } = await runAgent({ system: loadPrompt(), user: userMsg, maxTurns: 30 });

  const blocks = extractBlocks(text);
  if (!blocks.length) {
    console.error('Agent returned no code blocks. Raw output:\n', text);
    process.exit(2);
  }

  for (const b of blocks) {
    const dest = path.join(process.cwd(), b.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, b.body);
    logger.info(`✎ ${b.file}`);
  }
  logger.info(`Generated ${blocks.length} file(s).`);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { main };

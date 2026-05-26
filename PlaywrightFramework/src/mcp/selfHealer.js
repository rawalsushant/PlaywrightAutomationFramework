#!/usr/bin/env node
/**
 * selfHealer — given a list of locator misses captured during a test run,
 * uses the Playwright MCP agent to propose stable replacements and patches
 * the matching src/locators/<scope>.locators.js file in place.
 *
 * Two entry points:
 *   - healFromMisses(page, misses)  invoked from the After hook after a failure
 *   - CLI: node src/mcp/selfHealer.js --report reports/locator-misses.json
 */
const fs = require('fs');
const path = require('path');
const { runAgent } = require('./mcpClient');
const logger = require('../utils/logger');

const LOCATORS_DIR = path.join(__dirname, '..', 'locators');

function loadPrompt() {
  return fs.readFileSync(path.join(__dirname, 'prompts', 'heal-locator.md'), 'utf8');
}

function parseJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) throw new Error('Agent response missing JSON block');
  return JSON.parse(match[1]);
}

/**
 * Rewrites only the changed entry inside the locators file using a regex,
 * preserving comments and ordering. Falls back to a full re-emit if the
 * key isn't found.
 */
function patchLocatorFile(scope, key, proposal) {
  const file = path.join(LOCATORS_DIR, `${scope}.locators.js`);
  if (!fs.existsSync(file)) throw new Error(`Locator file not found: ${file}`);

  const original = fs.readFileSync(file, 'utf8');
  const entryRegex = new RegExp(`(${key}\\s*:\\s*\\{)([\\s\\S]*?)(\\n\\s*\\},?)`, 'm');
  if (!entryRegex.test(original)) {
    logger.warn(`Could not locate "${key}" in ${file}; skipping patch`);
    return false;
  }

  const newBody = [
    `\n    description: ${JSON.stringify(proposal.description || `${scope}.${key} (healed)`)},`,
    `    primary: ${JSON.stringify(proposal.primary)},`,
    `    fallbacks: ${JSON.stringify(proposal.fallbacks || [])},`,
    proposal.role ? `    role: ${JSON.stringify(proposal.role)},` : null,
    proposal.name ? `    name: ${JSON.stringify(proposal.name)},` : null,
    `    _healed: { at: ${JSON.stringify(new Date().toISOString())}, confidence: ${proposal.confidence ?? 0}, rationale: ${JSON.stringify(proposal.rationale || '')} }`
  ].filter(Boolean).join('\n  ');

  const patched = original.replace(entryRegex, `$1${newBody}$3`);
  const backup = `${file}.bak`;
  fs.writeFileSync(backup, original);
  fs.writeFileSync(file, patched);
  logger.info(`Healed ${scope}.${key} (backup at ${path.relative(process.cwd(), backup)})`);
  return true;
}

async function healMiss(miss) {
  const prompt = loadPrompt();
  const userMsg = [
    `Heal this locator miss:`,
    `  scope: ${miss.scope}`,
    `  key: ${miss.key}`,
    `  description: ${miss.description}`,
    `  url: ${miss.url}`,
    `  attempts: ${JSON.stringify(miss.tried, null, 2)}`,
    ``,
    `Open the URL with the Playwright MCP tools, take a snapshot, propose a replacement.`
  ].join('\n');

  const { text } = await runAgent({ system: prompt, user: userMsg, maxTurns: 20 });
  const proposal = parseJsonBlock(text);
  if (!proposal.primary) {
    logger.warn(`Healer could not propose a selector for ${miss.scope}.${miss.key}: ${proposal.rationale}`);
    return false;
  }
  return patchLocatorFile(miss.scope, miss.key, proposal);
}

async function healFromMisses(_page, misses) {
  const seen = new Set();
  let healed = 0;
  for (const m of misses) {
    const id = `${m.scope}.${m.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    try {
      if (await healMiss(m)) healed++;
    } catch (err) {
      logger.error(`Heal failed for ${id}: ${err.message}`);
    }
  }
  logger.info(`Self-healer finished — ${healed}/${seen.size} locator(s) updated`);
  return healed;
}

async function cliMain() {
  const reportFlag = process.argv.indexOf('--report');
  const reportPath = reportFlag > -1 ? process.argv[reportFlag + 1] : 'reports/locator-misses.json';
  if (!fs.existsSync(reportPath)) {
    console.error(`No miss report at ${reportPath}`); process.exit(1);
  }
  const misses = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  await healFromMisses(null, misses);
}

if (require.main === module) {
  cliMain().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { healFromMisses, healMiss, patchLocatorFile };

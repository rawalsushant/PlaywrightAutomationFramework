const { chromium, firefox, webkit } = require('@playwright/test');

const ENGINES = { chromium, firefox, webkit };

async function launchBrowser({ name = 'chromium', headless = true } = {}) {
  const engine = ENGINES[name];
  if (!engine) throw new Error(`Unsupported browser "${name}"`);
  return engine.launch({ headless, args: ['--disable-blink-features=AutomationControlled'] });
}

module.exports = { launchBrowser };

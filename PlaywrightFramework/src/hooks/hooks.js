const { Before, After, BeforeAll, AfterAll, Status } = require('@cucumber/cucumber');
const path = require('path');
const fs = require('fs');
const { launchBrowser } = require('../utils/browserManager');
const LocatorValidator = require('../validators/LocatorValidator');
const logger = require('../utils/logger');

let sharedBrowser;

BeforeAll({ timeout: 60_000 }, async function () {
  sharedBrowser = await launchBrowser({
    name: process.env.MCP_BROWSER || 'chromium',
    headless: !(process.env.HEADED === 'true')
  });
});

AfterAll(async function () {
  if (sharedBrowser) await sharedBrowser.close();
});

Before(async function (scenario) {
  this.scenarioName = scenario.pickle.name;
  this.browser = sharedBrowser;
  this.context = await sharedBrowser.newContext({ viewport: { width: 1440, height: 900 } });
  this.page = await this.context.newPage();

  this.locatorMisses = [];
  this._missListener = (d) => this.locatorMisses.push(d);
  LocatorValidator.events.on('locator:miss', this._missListener);

  logger.info(`▶ ${this.scenarioName}`);
});

After(async function (scenario) {
  const failed = scenario.result?.status === Status.FAILED;

  if (failed) {
    const dir = path.join('reports', 'failures');
    fs.mkdirSync(dir, { recursive: true });
    const safe = this.scenarioName.replace(/[^a-z0-9]+/gi, '_').slice(0, 80);
    const shot = path.join(dir, `${safe}.png`);
    try {
      const buffer = await this.page.screenshot({ path: shot, fullPage: true });
      this.attach(buffer, 'image/png');
    } catch (_) { /* page may already be closed */ }

    if (this.parameters.selfHeal && this.locatorMisses.length) {
      try {
        const { healFromMisses } = require('../mcp/selfHealer');
        await healFromMisses(this.page, this.locatorMisses);
        this.attach(`Self-healer triggered for ${this.locatorMisses.length} miss(es). See locators/*.js.`, 'text/plain');
      } catch (err) {
        logger.warn(`Self-healer error: ${err.message}`);
      }
    }
  }

  LocatorValidator.events.off('locator:miss', this._missListener);
  await this.context?.close();
  logger.info(`${failed ? '✗' : '✓'} ${this.scenarioName}`);
});

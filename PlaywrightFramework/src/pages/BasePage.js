const LocatorValidator = require('../validators/LocatorValidator');
const logger = require('../utils/logger');

/**
 * BasePage centralises locator resolution. Page objects never call
 * page.locator(...) directly — they call this.resolve('key') so every
 * interaction goes through the validator and the self-healer hook.
 */
class BasePage {
  constructor(page, scope) {
    if (!page) throw new Error('BasePage requires a Playwright page');
    if (!scope) throw new Error('BasePage requires a locator scope');
    this.page = page;
    this.scope = scope;
    this.validator = new LocatorValidator(page, scope);
  }

  async resolve(key, { timeout } = {}) {
    return this.validator.resolve(key, { timeout });
  }

  async click(key) {
    const handle = await this.resolve(key);
    logger.debug(`click → ${this.scope}.${key}`);
    await handle.click();
  }

  async fill(key, value) {
    const handle = await this.resolve(key);
    logger.debug(`fill → ${this.scope}.${key} = "${value}"`);
    await handle.fill(value);
  }

  async type(key, value, delay = 30) {
    const handle = await this.resolve(key);
    await handle.type(value, { delay });
  }

  async waitForVisible(key, timeout = 10_000) {
    const handle = await this.resolve(key, { timeout });
    await handle.waitFor({ state: 'visible', timeout });
  }
}

module.exports = BasePage;

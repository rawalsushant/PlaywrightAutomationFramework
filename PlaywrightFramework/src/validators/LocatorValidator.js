const registry = require('../locators');
const logger = require('../utils/logger');

/**
 * LocatorValidator is the single point through which selectors are resolved.
 *
 * Why a dedicated class:
 *  - Single failure surface — every locator miss produces the same structured
 *    diagnostic (scope, key, primary, fallbacks tried, page URL, snippet).
 *  - Fallback chain — primary → fallbacks[] tried in order.
 *  - Healing hook — on total failure, emits a `locator:miss` event the
 *    self-healer (src/mcp/selfHealer.js) listens for.
 *  - Speeds up debugging — instead of "Timeout waiting for selector",
 *    you get exactly which scope, which key, what was tried, and why.
 */
const { EventEmitter } = require('events');
const events = new EventEmitter();

class LocatorValidator {
  constructor(page, scope) {
    this.page = page;
    this.scope = scope;
  }

  static get events() { return events; }

  _entry(key) {
    const scopeBag = registry[this.scope];
    if (!scopeBag) throw new Error(`Locator scope "${this.scope}" is not registered`);
    const entry = scopeBag[key];
    if (!entry) throw new Error(`Locator "${this.scope}.${key}" not defined`);
    return entry;
  }

  async resolve(key, { timeout = 5_000 } = {}) {
    const entry = this._entry(key);
    const candidates = [entry.primary, ...(entry.fallbacks || [])];
    const tried = [];

    for (const selector of candidates) {
      try {
        const handle = this.page.locator(selector).first();
        await handle.waitFor({ state: 'attached', timeout });
        if (selector !== entry.primary) {
          logger.warn(
            `Locator "${this.scope}.${key}" matched via fallback "${selector}". ` +
            `Consider promoting it to primary.`
          );
        }
        return handle;
      } catch (err) {
        tried.push({ selector, error: err.message });
      }
    }

    const diagnostic = {
      scope: this.scope,
      key,
      description: entry.description,
      role: entry.role,
      name: entry.name,
      tried,
      url: this.page.url()
    };
    events.emit('locator:miss', diagnostic);

    const lines = [
      `Locator "${this.scope}.${key}" could not be resolved.`,
      `  description : ${entry.description}`,
      `  url         : ${diagnostic.url}`,
      `  attempts    :`,
      ...tried.map(t => `    - ${t.selector}   ✗ ${t.error.split('\n')[0]}`)
    ];
    const error = new Error(lines.join('\n'));
    error.diagnostic = diagnostic;
    throw error;
  }
}

module.exports = LocatorValidator;

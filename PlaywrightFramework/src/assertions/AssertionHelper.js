const { expect } = require('@playwright/test');
const LocatorValidator = require('../validators/LocatorValidator');
const logger = require('../utils/logger');

/**
 * AssertionHelper is the only place tests should call `expect`.
 *
 * Why:
 *  - Locator-key strings ("login.errorBanner") are resolved via the validator,
 *    so an assertion failure tells you which locator and which expectation
 *    failed, not "expected X to equal Y" with no scope.
 *  - Every assertion emits a structured log line, so flaky failures are easy
 *    to triage from CI output alone.
 *  - Adding a new assertion type happens here once, not scattered in steps.
 */
function splitKey(key) {
  const [scope, ...rest] = key.split('.');
  if (!scope || rest.length === 0) {
    throw new Error(`Assertion key must be "scope.locatorKey", got "${key}"`);
  }
  return { scope, locatorKey: rest.join('.') };
}

async function resolve(page, key) {
  const { scope, locatorKey } = splitKey(key);
  const validator = new LocatorValidator(page, scope);
  return validator.resolve(locatorKey);
}

async function guarded(label, key, fn) {
  try {
    await fn();
    logger.info(`assert PASS  ${label} (${key ?? '-'})`);
  } catch (err) {
    logger.error(`assert FAIL  ${label} (${key ?? '-'}) — ${err.message.split('\n')[0]}`);
    throw err;
  }
}

const AssertionHelper = {
  async elementVisible(page, key) {
    await guarded('visible', key, async () => {
      const handle = await resolve(page, key);
      await expect(handle).toBeVisible();
    });
  },

  async elementHidden(page, key) {
    await guarded('hidden', key, async () => {
      const handle = await resolve(page, key);
      await expect(handle).toBeHidden();
    });
  },

  async elementHasText(page, key, expected) {
    await guarded(`hasText="${expected}"`, key, async () => {
      const handle = await resolve(page, key);
      await expect(handle).toHaveText(expected);
    });
  },

  async elementContainsText(page, key, expected) {
    await guarded(`containsText="${expected}"`, key, async () => {
      const handle = await resolve(page, key);
      await expect(handle).toContainText(expected);
    });
  },

  async elementHasAttribute(page, key, attribute, expected) {
    await guarded(`attr[${attribute}]="${expected}"`, key, async () => {
      const handle = await resolve(page, key);
      await expect(handle).toHaveAttribute(attribute, expected);
    });
  },

  async elementCount(page, key, expected) {
    await guarded(`count=${expected}`, key, async () => {
      const { scope, locatorKey } = splitKey(key);
      const validator = new LocatorValidator(page, scope);
      const handle = await validator.resolve(locatorKey);
      await expect(handle).toHaveCount(expected);
    });
  },

  async urlContains(page, fragment) {
    await guarded(`urlContains="${fragment}"`, null, async () => {
      await expect(page).toHaveURL(new RegExp(fragment.replace(/[/\\^$.*+?()[\]{}|]/g, '\\$&')));
    });
  },

  async pageTitleEquals(page, expected) {
    await guarded(`title="${expected}"`, null, async () => {
      await expect(page).toHaveTitle(expected);
    });
  },

  async apiStatus(response, expected) {
    await guarded(`apiStatus=${expected}`, null, async () => {
      if (response.status() !== expected) {
        throw new Error(`Expected ${expected}, got ${response.status()}`);
      }
    });
  }
};

module.exports = AssertionHelper;

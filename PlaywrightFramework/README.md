# Playwright + Cucumber Framework (with Playwright MCP)

Modular BDD test framework. Strict separation between **locators**, **assertions**, and **page actions** — and an MCP agent layer that can generate tests and self-heal broken locators using the official [Playwright MCP server](https://github.com/microsoft/playwright-mcp).

---

## 1. Quick start

```bash
cp .env.example .env           # set ANTHROPIC_API_KEY for MCP flows
npm install
npx playwright install
npm test                       # runs every feature
npm run test:smoke             # tags
TEST_ENV=qa npm test           # env switch
HEADED=true npm run test:debug # headed + verbose Playwright
```

## 2. Directory layout

```
features/                    Gherkin .feature files
src/
  steps/                     Step definitions (thin glue — no expects, no selectors)
  pages/                     Page objects (actions only; extend BasePage)
  locators/                  Pure-data selector modules — one file per page
  validators/                LocatorValidator: resolves + diagnoses + emits miss events
  assertions/                AssertionHelper: every expect() lives here
  hooks/                     Cucumber Before/After (screenshot, healing trigger)
  utils/                     logger, config, browserManager
  mcp/                       MCP agents (generator, self-healer, prompts)
  world.js                   Cucumber World (config + browser + page per scenario)
config/
  cucumber.js                BDD runner config
  playwright.config.js       Browser/projects/timeouts
  env/dev.json, env/qa.json  Per-env URLs + users
reports/                     HTML/JSON + failure screenshots
.mcp.json                    Playwright MCP server registration (Claude Desktop / Code)
```

## 3. The three separation principles

### 3a. Locators in their own files
`src/locators/<page>.locators.js` exports a plain object. No Playwright import, no logic — just selectors. The self-healer is allowed to rewrite these files.

```js
module.exports = {
  submitButton: {
    description: 'Sign-in submit button',
    primary: '[data-testid="login-submit"]',
    fallbacks: ['button[type="submit"]', 'button:has-text("Sign in")'],
    role: 'button',
    name: 'Sign in'
  }
};
```

### 3b. Locator validation in `LocatorValidator`
Every interaction goes through `BasePage.resolve(key)` → `LocatorValidator.resolve(scope, key)`. The validator:
1. Tries `primary`, then each `fallback` in order.
2. If a fallback wins, logs a warning (so flaky locators don't hide).
3. On total failure, throws a **structured error** (scope, key, URL, every selector tried, why each one failed) and emits a `locator:miss` event that the self-healer subscribes to.

This is the single thing that makes debugging quick — failures point at exactly which locator on which page on which URL failed, with the chain that was attempted.

### 3c. Assertions in `AssertionHelper`
Steps never call `expect()` directly. They call `AssertionHelper.elementHasText(page, 'login.errorBanner', 'Invalid')`. Benefits:
- Every assertion logs a pass/fail line with the locator key.
- Adding a new assertion type happens once.
- The helper resolves locators via the validator, so assertion failures get the same rich diagnostic.

## 4. MCP integration

`.mcp.json` registers the **Playwright MCP server** (Microsoft, `@playwright/mcp`) so Claude Code / Claude Desktop can drive a browser directly. The framework also embeds an SDK-level MCP client (`src/mcp/mcpClient.js`) so its own agents can use the same tools programmatically.

### 4a. Test generation agent

```bash
npm run mcp:generate -- --url https://your-app.com/login
# or
npm run mcp:generate -- --story ./test-data/stories/checkout.md
```

The agent opens the URL via Playwright MCP, takes accessibility snapshots, explores the page, and emits three files: a `.feature`, a step skeleton, and a locators file. The prompt (`src/mcp/prompts/generate-feature.md`) enforces ARIA-first selectors and our locator schema.

### 4b. Self-healing on failure
The `After` hook (`src/hooks/hooks.js`) checks for buffered `locator:miss` events. If the scenario failed **and** `SELF_HEAL=true`, it invokes `selfHealer.healFromMisses(page, misses)`. For each unique miss:

1. The agent navigates to the same URL via MCP.
2. Takes a snapshot and proposes `{ primary, fallbacks[], role, name, confidence, rationale }` per `src/mcp/prompts/heal-locator.md`.
3. `patchLocatorFile()` regex-patches just that entry in `src/locators/<scope>.locators.js`, leaving a `.bak`. The entry is annotated with `_healed: { at, confidence, rationale }` so a human can review it on the next PR.

You can also run it standalone against a saved miss report:
```bash
node src/mcp/selfHealer.js --report reports/locator-misses.json
```

### 4c. Using the agents from Claude Code / Claude Desktop
Because `.mcp.json` is at the repo root, opening this folder in a Claude Code session auto-loads the Playwright MCP tools. You can then ask Claude to "open the dashboard and write a feature for the export flow" and it will use the same browser tools the agents use — no extra wiring.

## 5. Conventions cheat sheet

| Layer            | What lives here                                | What does NOT                           |
| ---------------- | ---------------------------------------------- | --------------------------------------- |
| `features/`      | Business-readable scenarios                    | Code, selectors                         |
| `src/steps/`     | Glue from Gherkin → page object / assertion    | `expect`, raw selectors                 |
| `src/pages/`     | User-flow actions (`login()`, `addToCart()`)   | Assertions, hard-coded selectors        |
| `src/locators/`  | Selector data only                             | Imports, logic                          |
| `src/validators/`| Selector resolution + diagnostics              | Business logic                          |
| `src/assertions/`| Every `expect()`                               | Selectors as strings (use keys)         |

## 6. Adding a new page

1. `src/locators/myPage.locators.js` — define selectors.
2. Register it in `src/locators/index.js`.
3. `src/pages/MyPage.js` — `extends BasePage`, scope `'myPage'`, expose actions.
4. Write the feature; reference assertions as `'myPage.someKey'`.

That's the whole loop — locators, page, feature. The validator and assertion helper need no changes.

## 7. Environment variables

| Var               | Default        | Purpose                              |
| ----------------- | -------------- | ------------------------------------ |
| `TEST_ENV`        | `dev`          | Picks `config/env/<env>.json`        |
| `HEADED`          | `false`        | Run browsers headed                  |
| `PARALLEL`        | `1`            | Cucumber workers                     |
| `RETRY`           | `0`            | Auto-retry failed scenarios          |
| `SELF_HEAL`       | `true`         | Run healer after failures            |
| `ANTHROPIC_API_KEY` | —            | Required for any MCP agent          |
| `ANTHROPIC_MODEL` | `claude-opus-4-7` | Model the agents call            |
| `MCP_BROWSER`     | `chromium`     | Browser the MCP server drives        |
| `MCP_HEADLESS`    | `true`         | Headless mode for the MCP browser    |

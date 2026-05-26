# PlaywrightAutomationFramework
End to End Playwright Automation Framework with Agentic capabilities to help generate and heal failed test cases.

<img width="500" height="500" alt="playwright_bdd_framework_architecture" src="https://github.com/user-attachments/assets/8d92abfd-7bae-4ac9-9bb0-a88bfacca6fe" />

## 📂 Project Structure

This project follows a BDD (Behavior-Driven Development) pattern combined with the Page Object Model (POM) and AI-assisted MCP (Model Context Protocol) agents for automation.

```text
project-root/
├── features/                     # Gherkin .feature files
├── step-definitions/             # Given/When/Then step implementations
├── core/                         # Core framework architecture
│   ├── locators/                 # Centralized UI selectors
│   │   └── locators.js           # ALL elements/selectors live here
│   ├── assertions/               # Custom assertion wrappers
│   │   └── assertions.js         # ALL expect() wrappers live here
│   ├── pages/                    # Page Object classes (POM)
│   ├── helpers/                  # Utilities (wait, retry, screenshot, etc.)
│   └── api/                      # API request context helpers
├── fixtures/                     # Test fixtures (browser, page, context setup)
├── test-data/                    # Test data management (JSON / CSV / Faker configs)
├── mcp-agents/                   # AI/MCP Agent configurations
│   ├── mcp.config.js             # @playwright/mcp server configuration
│   ├── generator.agent.js        # AI agent for test case & script generation
│   └── self-heal.agent.js        # AI agent for broken locator detection & fixing
├── reports/                      # Test execution reports (Allure / HTML output)
├── cucumber.js                   # Cucumber runner configuration
└── playwright.config.js          # Playwright test configuration
```
1. Locators live in *.locators.js modules — pure data exports. Page objects import them. Healing rewrites these files only.
2. Assertions funnel through AssertionHelper — every expect lives there so failures log uniformly and the self-healer has a hook point.
3. Locator validation runs through LocatorValidator before any interaction — fast, deterministic failure with diagnostics before the test even tries to click.

MCP integration model: Playwright MCP (Microsoft's official server) gives the LLM browser tools (snapshot, click, type, navigate). The Anthropic SDK connects to it as an MCP client. Three agent flows:

* testGenerator — given a URL or user story, explores the app and emits .feature + step skeleton
* selfHealer — on locator failure, takes a DOM snapshot, asks the LLM for a new selector, patches the locators file, retries
* both reuse the same mcpClient so credentials/config live in one place


* src/locators/login.locators.js — pure-data selector files (no Playwright imports, just { primary, fallbacks, role, name, description }). One file per page, registered in src/locators/index.js.
* src/validators/LocatorValidator.js — every interaction routes through BasePage.resolve() → validator. Tries primary, then fallbacks, then throws a structured error (scope, key, URL, every selector attempted + why) and emits a locator:miss event. This is the piece that makes triage fast.
* src/assertions/AssertionHelper.js — only place expect() lives. Steps pass locator keys like 'login.errorBanner', the helper resolves through the validator, logs pass/fail per assertion.


MCP integration (Microsoft's official @playwright/mcp)

* .mcp.json — registers the server so Claude Code / Claude Desktop auto-loads the browser tools when you open this folder.
* src/mcp/mcpClient.js — Anthropic SDK ↔ Playwright MCP bridge; agentic loop with tool-use, used by both agents below.
* src/mcp/testGenerator.js — npm run mcp:generate -- --url <url> opens the page via MCP, explores it, emits .feature + steps + locators.
* src/mcp/selfHealer.js — invoked automatically from the After hook (src/hooks/hooks.js:42) when SELF_HEAL=true and a scenario failed with a locator miss. Regex-patches just the failing entry inside *.locators.js, leaves a .bak, annotates _healed: { at, confidence, rationale } so reviewers can see what was changed.
* Prompts are externalised in src/mcp/prompts/ so you can tune behaviour without editing JS.


Next steps for you
1. npm install && npx playwright install
2. Set ANTHROPIC_API_KEY in .env
3. Update config/env/dev.json with real URLs/users
4. Replace the placeholder login test in features/login.feature and src/locators/login.locators.js with selectors from your actual app — or run npm run mcp:generate -- --url <your-app> and let the agent draft the first one.

Two design choices to flag, in case you want to adjust:
* Healer auto-commits to the locators file (with .bak). Some teams prefer the healer to only propose (write to a reports/healing-proposals.json) and require human review before locators change. Toggle is SELF_HEAL; happy to add a SELF_HEAL_MODE=propose|apply if you want both.
* Single shared browser, fresh context per scenario in hooks.js. Faster than launching per scenario but means a hung scenario can affect the next. If your tests do anything browser-crashing, switch to per-scenario launch.


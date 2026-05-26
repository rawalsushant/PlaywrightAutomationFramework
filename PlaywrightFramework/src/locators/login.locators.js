/**
 * Locators are pure data — no Playwright imports here.
 * Each entry: { description, primary, fallbacks?, role?, name? }
 *
 *   primary    : the preferred selector (CSS / XPath / Playwright selector engine)
 *   fallbacks  : ordered list tried by LocatorValidator if primary fails
 *   role/name  : ARIA hints — used by the self-healer when proposing a new locator
 *
 * The self-healing agent is allowed to rewrite this file; keep it side-effect free.
 */
module.exports = {
  usernameInput: {
    description: 'Username input on login form',
    primary: '[data-testid="username"]',
    fallbacks: ['input[name="username"]', '#username'],
    role: 'textbox',
    name: 'Username'
  },
  passwordInput: {
    description: 'Password input on login form',
    primary: '[data-testid="password"]',
    fallbacks: ['input[name="password"]', '#password'],
    role: 'textbox',
    name: 'Password'
  },
  submitButton: {
    description: 'Sign-in submit button',
    primary: '[data-testid="login-submit"]',
    fallbacks: ['button[type="submit"]', 'button:has-text("Sign in")'],
    role: 'button',
    name: 'Sign in'
  },
  errorBanner: {
    description: 'Inline error message shown above the form',
    primary: '[data-testid="login-error"]',
    fallbacks: ['.error-banner', '[role="alert"]'],
    role: 'alert'
  }
};

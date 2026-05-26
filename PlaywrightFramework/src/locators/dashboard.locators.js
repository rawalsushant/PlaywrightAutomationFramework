module.exports = {
  welcomeBanner: {
    description: 'Dashboard welcome banner displayed post-login',
    primary: '[data-testid="welcome-banner"]',
    fallbacks: ['h1.welcome', 'header h1'],
    role: 'heading'
  },
  userMenu: {
    description: 'User menu trigger in the top-right corner',
    primary: '[data-testid="user-menu"]',
    fallbacks: ['button[aria-label="User menu"]'],
    role: 'button',
    name: 'User menu'
  }
};

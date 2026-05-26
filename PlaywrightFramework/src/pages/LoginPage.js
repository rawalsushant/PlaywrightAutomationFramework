const BasePage = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page, 'login');
  }

  async open(baseUrl) {
    await this.page.goto(`${baseUrl.replace(/\/$/, '')}/login`, { waitUntil: 'domcontentloaded' });
    await this.waitForVisible('usernameInput');
  }

  async login(username, password) {
    if (username) await this.fill('usernameInput', username);
    if (password) await this.fill('passwordInput', password);
    await this.click('submitButton');
  }
}

module.exports = LoginPage;

const { Given, When, Then } = require('@cucumber/cucumber');
const LoginPage = require('../pages/LoginPage');
const AssertionHelper = require('../assertions/AssertionHelper');

Given('I am on the login page', async function () {
  this.loginPage = new LoginPage(this.page);
  await this.loginPage.open(this.config.baseUrl);
});

When('I sign in as {string}', async function (userKey) {
  const user = this.config.users[userKey];
  if (!user) throw new Error(`Unknown user key "${userKey}" in env config`);
  await this.loginPage.login(user.username, user.password);
});

When('I sign in with username {string} and password {string}', async function (username, password) {
  await this.loginPage.login(username, password);
});

Then('I should see the dashboard', async function () {
  await AssertionHelper.urlContains(this.page, '/dashboard');
});

Then('the welcome message should contain {string}', async function (expected) {
  await AssertionHelper.elementContainsText(this.page, 'dashboard.welcomeBanner', expected);
});

Then('I should see an error message {string}', async function (expected) {
  await AssertionHelper.elementHasText(this.page, 'login.errorBanner', expected);
});

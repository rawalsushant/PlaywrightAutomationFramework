const { Given, When, Then } = require('@cucumber/cucumber');
const AssertionHelper = require('../assertions/AssertionHelper');

Given('I navigate to {string}', async function (path) {
  const url = new URL(path, this.config.baseUrl).toString();
  await this.page.goto(url, { waitUntil: 'domcontentloaded' });
});

When('I wait for {int} ms', async function (ms) {
  await this.page.waitForTimeout(ms);
});

Then('the page title should be {string}', async function (expected) {
  await AssertionHelper.pageTitleEquals(this.page, expected);
});

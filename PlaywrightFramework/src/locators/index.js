/**
 * Registry of locator namespaces. Keys are used as the "scope" prefix
 * when AssertionHelper / LocatorValidator receive a "scope.locatorKey" string.
 */
module.exports = {
  login: require('./login.locators'),
  dashboard: require('./dashboard.locators')
};

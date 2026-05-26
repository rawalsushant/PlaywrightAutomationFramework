const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');
const { loadEnvConfig } = require('./utils/config');

setDefaultTimeout(60_000);

class CustomWorld {
  constructor({ parameters }) {
    this.parameters = parameters;
    this.config = loadEnvConfig(parameters.env);
    this.browser = null;
    this.context = null;
    this.page = null;
  }
}

setWorldConstructor(CustomWorld);

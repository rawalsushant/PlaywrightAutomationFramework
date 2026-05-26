require('dotenv').config();
const path = require('path');
const fs = require('fs');

function loadEnvConfig(envName = process.env.TEST_ENV || 'dev') {
  const file = path.join(__dirname, '..', '..', 'config', 'env', `${envName}.json`);
  if (!fs.existsSync(file)) throw new Error(`Env config not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = { loadEnvConfig };

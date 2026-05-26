module.exports = {
  default: {
    requireModule: [],
    require: [
      'src/world.js',
      'src/hooks/hooks.js',
      'src/steps/**/*.steps.js'
    ],
    paths: ['features/**/*.feature'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
      'summary'
    ],
    formatOptions: { snippetInterface: 'async-await' },
    parallel: Number(process.env.PARALLEL || 1),
    retry: Number(process.env.RETRY || 0),
    publishQuiet: true,
    worldParameters: {
      env: process.env.TEST_ENV || 'dev',
      headed: process.env.HEADED === 'true',
      selfHeal: process.env.SELF_HEAL !== 'false'
    }
  }
};

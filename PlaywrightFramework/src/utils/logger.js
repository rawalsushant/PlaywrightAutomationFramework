const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'HH:mm:ss.SSS' }),
    format.printf(({ level, message, timestamp }) =>
      `${timestamp} ${level.toUpperCase().padEnd(5)} ${message}`
    )
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'reports/test.log' })
  ]
});

module.exports = logger;

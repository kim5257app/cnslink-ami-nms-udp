const Winston = require('winston');
require('winston-daily-rotate-file');

const logger = Winston.createLogger({
  level: 'info',
  format: Winston.format.json(),
  defaultMeta: { service: 'ami-api' },
  transports: [
    new Winston.transports.Console(),
    new Winston.transports.DailyRotateFile({
      dirname: './log',
      filename: 'ami-api-%DATE%.log',
      datePattern: 'YYYYMMDDHH',
      maxFiles: '14d',
    }),
  ],
});

module.exports = logger;

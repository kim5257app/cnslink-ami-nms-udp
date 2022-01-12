const udp = require('./udp');
const db = require('./db');
const config = require('./config/config');
const logger = require('./debug/logger');

(async () => {
  logger.info('DB initializing...');
  await db.initialize(config.db);
  logger.info('DB initialized');

  logger.info('UDP Server initializing...');
  await udp.initialize(config.udp);
  logger.info('UDP Server initialized');
})();

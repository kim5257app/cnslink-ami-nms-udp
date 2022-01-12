const dgram = require('dgram');
const logger = require('../debug/logger');
const { packetHandler } = require('./packet');

function initialize(args) {
  return new Promise((resolve, reject) => {
    const server = dgram.createSocket('udp4');

    server.on('message', async (msg, rinfo) => {
      logger.info(`message: ${msg}, ${rinfo.size}`);
      await packetHandler(msg, rinfo, server);
    });

    server.on('error', (error) => {
      reject(error);
    });

    server.on('listening', () => {
      logger.info(`listen: ${args.port}`);

      resolve();
    });

    server.bind(args.port);
  });
}

module.exports.initialize = initialize;

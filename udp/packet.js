const db = require('../db/index');
const nmsQuery = require('../db/query/nms');
const logger = require('../debug/logger');
const Error = require('../debug/error');

/**
 * @param {Buffer} buffer
 * @param {number} start
 * @param {number} end
 */
function bufToStr(buffer, start, end) {
  return buffer.slice(start, end).toString('ascii', 0);
}

/**
 * @param {Buffer} buffer
 * @param {number} start
 * @param {number} end
 */
// eslint-disable-next-line no-unused-vars
function bufToInt(buffer, start, end) {
  return parseInt(bufToStr(buffer, start, end), 10);
}

/**
 * @param {Buffer} buffer
 * @param {number} start
 * @param {number} end
 */
function bufToFloat(buffer, start, end) {
  return parseFloat(bufToStr(buffer, start, end));
}

/**
 * @param {{cmd: string, data: string}} resp
 * @param {RemoteInfo} rinfo
 * @param {Socket} socket
 */
function response(resp, rinfo, socket) {
  const payload = Buffer.alloc(resp.data.length + 1);

  payload.write(resp.cmd, 0, 'ascii');
  payload.write(resp.data, 1, 'ascii');

  socket.send(payload, rinfo.port, rinfo.address, (error) => {
    if (error != null) {
      logger.error(`send error(${error.name}): ${error.message}`);
    }
  });
}

/**
 * @param {Buffer} msg
 */
function parsePacket(msg) {
  let offset = 0;

  const cmd = bufToStr(msg, offset, (offset += 1));
  const ctn = bufToStr(msg, offset, (offset += 8));
  const data = bufToStr(msg, offset, msg.length);

  return { cmd, ctn, data };
}

/**
 * @param {string} cmd
 * @param {string} ctn
 * @param {string} data
 */
async function insertStatus(cmd, ctn, data) {
  try {
    let offset = 0;

    const info = {
      ssimFailure: data.slice(offset, (offset += 1)),
      ssimExist: data.slice(offset, (offset += 1)),
      gasLeak: data.slice(offset, (offset += 1)),
      gasLowPressure: data.slice(offset, (offset += 1)),
      lowPower: data.slice(offset, (offset += 1)),
      gasOverflow: data.slice(offset, (offset += 1)),
      gasUnused: data.slice(offset, (offset += 1)),
      gasBackflow: data.slice(offset, (offset += 1)),
      errorState3: data.slice(offset, (offset += 1)),
      errorState2: data.slice(offset, (offset += 1)),
      errorState1: data.slice(offset, (offset += 1)),
      errorState0: data.slice(offset, (offset += 1)),
      kmsState: data.slice(offset, (offset += 2)),
      count: data.slice(offset, (offset + 3)),
    };

    logger.info(`insert info: ${data.length} ${JSON.stringify(info)}`);

    // 상태 정보 추가
    await db.getInstance().query(nmsQuery.insertStatus({
      ctn,
      ...info,
    }));
  } catch (error) {
    // eslint-disable-next-line no-throw-literal
    throw {
      ...error,
    };
  }
}

/**
 * @param {string} cmd
 * @param {string} ctn
 * @param {string} data
 * @param {RemoteInfo} rinfo
 * @param {Socket} socket
 */
async function sendCommand({
  cmd,
  ctn,
  data,
  rinfo,
  socket,
}) {
  try {
    // CTN에 해당하는 명령 조회
    const command = await db.getInstance()
      .query(nmsQuery.getCommand({ ctn }));

    if (command != null) {
      // 명령 전송
      response(command, rinfo, socket);

      await db.getInstance()
        .query(nmsQuery.updateCommandStatus({ status: 1, no: command.no }));
    } else {
      // ACK로 마무리
      response({ cmd: 'A', data: '' }, rinfo, socket);
    }
  } catch (error) {
    // eslint-disable-next-line no-throw-literal
    throw {
      ...error,
    };
  }
}

async function respondCommand({
  ctn,
  rinfo,
  socket,
}) {
  try {
    // 요청했던 명령에 대해 완료로 업데이트
    await db.getInstance()
      .query(nmsQuery.updateCommandStatus({ status: 2, ctn }));

    // CTN에 해당하는 명령 조회
    const command = await db.getInstance()
      .query(nmsQuery.getCommand({ ctn }));

    if (command != null) {
      // 명령 전송
      response(command, rinfo, socket);

      await db.getInstance()
        .query(nmsQuery.updateCommandStatus({ status: 1, no: command.no }));
    }
  } catch (error) {
    // eslint-disable-next-line no-throw-literal
    throw {
      ...error,
    };
  }
}

/**
 * @param {Buffer} msg
 * @param {RemoteInfo} rinfo
 * @param {Socket} socket
 */
async function packetHandler(msg, rinfo, socket) {
  try {
    const { cmd, ctn, data } = parsePacket(msg);

    switch (cmd) {
      case 'P':
        await insertStatus(cmd, ctn, data);
        await sendCommand({ cmd, ctn, data, rinfo, socket });
        break;
      case 'A':
        await respondCommand({ cmd, ctn, data, rinfo, socket })
        break;
      default:
        response({ cmd: 'E', data: '' }, rinfo, socket);
        break;
    }
  } catch (error) {
    logger.error(`Error(${error.name}): ${error.message}`);
    response({ cmd: 'E', data: `${error.code}` }, rinfo, socket);
  }
}

module.exports.packetHandler = packetHandler;

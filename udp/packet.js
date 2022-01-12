const db = require('../db/index');
const aftQuery = require('../db/query/aft');
const logger = require('../debug/logger');
const Error = require('../debug/error');

const INT32MAX = 2 ** 32 - 1;

const MsgID = Object.freeze({
  MSG_ID_GET_NEW_MAC_ADDR: 0,
  MSG_ID_INSERT_RECORD: 1,
  MSG_ID_READ_RECORD: 2,
  MSG_ID_DEL_LAST_RECORD: 3,
  MSG_ID_CREATE_CSV_FILE: 4,
  MSG_ID_MODIFY_RECORD: 5,
  MSG_ID_DEL_RECORD_RECOVERY: 6,
  MSG_ID_LOGIN: 7,
  MSG_ID_GET_SERIAL: 8,
  MSG_ID_GET_CURRENT: 9,
  MSG_ID_SET_CURRENT: 10,
  MSG_ID_DELETE_SERIAL: 11,
  MSG_ID_UPDATE_SERIAL: 12,
  MSG_ID_GET_IMEI: 13,
});

const MsgResp = Object.freeze({
  DB_OK: 0,
  DB_ERROR: 1,
  DB_SOCKET_ERR: 2,
  DB_MAC1_ERR: 3,
  DB_IMEI_ERR: 4,
  DB_SERIALNO_ERR: 5,
  DB_NBIOT_SN_ERR: 6,
  DB_USIM_SN_ERR: 7,
});

/**
 * @param {Buffer} buffer
 * @param {number} start
 * @param {number} end
 */
function bufToStr(buffer, start, end) {
  const result = Buffer.alloc(end - start + 1);
  let offset = 0;

  for (let idx = start; idx < end; idx += 1) {
    if (buffer[idx] === 0) {
      break;
    }

    result[offset] = buffer[idx];
    offset += 1;
  }

  return result.toString('ascii', 0, offset);
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
 * @param {{id: number, ack: number}} resp
 * @param {RemoteInfo} rinfo
 * @param {Socket} socket
 */
function response(resp, rinfo, socket) {
  const payload = Buffer.alloc(8);

  payload.writeUInt32LE(resp.id, 0);
  payload.writeUInt32LE(resp.ack, 4);

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
  const id = msg.readUInt32LE(0);
  const ack = msg.readUInt32LE(4);
  const data = (msg.length > 8)
    ? msg.slice(8, msg.length)
    : null;

  return {
    id,
    ack,
    data,
  };
}

/**
 * @param {number} id
 * @param {number} ack
 * @param {Buffer} data
 */
async function insertRecord(id, ack, data) {
  try {
    let offset = 0;

    const info = {
      date: bufToStr(data, offset, (offset += 7)),
      time: bufToStr(data, offset, (offset += 7)),
      model: bufToStr(data, offset, (offset += 32)),
      serial: bufToStr(data, offset, (offset += 11)),
      firmware: bufToStr(data, offset, (offset += 32)),
      nbiotModel: bufToStr(data, offset, (offset += 32)),
      nbiotIMEI: bufToStr(data, offset, (offset += 16)),
      nbiotSerial: bufToStr(data, offset, (offset += 32)),
      nbiotFirmware: bufToStr(data, offset, (offset += 32)),
      nbiotRSRP: bufToFloat(data, offset, (offset += 7)),
      nbiotRSRQ: bufToFloat(data, offset, (offset += 7)),
      nbiotRSSI: bufToFloat(data, offset, (offset += 7)),
      nbiotTxPower: bufToFloat(data, offset, (offset += 7)),
      usim: bufToStr(data, offset, (offset += 32)),
      ssim: bufToStr(data, offset, (offset += 32)),
      result: bufToStr(data, offset, (offset += 64)),
      memo: bufToStr(data, offset, (offset + 128)),
      serviceCode: bufToStr(data, offset, (offset + 5)),
    };

    logger.info(`insert info: ${data.length} ${JSON.stringify(info)}`);

    // 데이터 중복 검사
    const checkResult = await db.getInstance().query(aftQuery.checkDuplicate(info));

    let respAck = 0;

    respAck = (checkResult.dupUsim) ? MsgResp.DB_USIM_SN_ERR : respAck;
    respAck = (checkResult.dupNbiotIMEI) ? MsgResp.DB_IMEI_ERR : respAck;
    respAck = (checkResult.dupNbiotSerial) ? MsgResp.DB_NBIOT_SN_ERR : respAck;
    respAck = (checkResult.dupSerial) ? MsgResp.DB_SERIALNO_ERR : respAck;

    if (respAck > 0) {
      Error.throwFail('ERR_DUPLICATED', 'Duplicated value', respAck);
    }

    // DB에 데이터 넣기
    await db.getInstance().query(aftQuery.insertProduction(info));
  } catch (error) {
    // eslint-disable-next-line no-throw-literal
    throw {
      ...error,
      id,
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
    const { id, ack, data } = parsePacket(msg);

    logger.info(`id: ${id}, ack: ${ack}, data: ${data ? data.length : 0}`);

    switch (id) {
      case MsgID.MSG_ID_INSERT_RECORD:
        await insertRecord(id, ack, data);
        break;
      default:
        response({ id, ack: INT32MAX }, rinfo, socket);
        break;
    }
  } catch (error) {
    logger.error(`Error(${error.name}): ${error.message}`);

    const resp = {
      id: (error.id != null) ? error.id : (INT32MAX),
      ack: (error.code != null) ? error.code : (INT32MAX),
    };

    response(resp, rinfo, socket);
  }
}

module.exports.packetHandler = packetHandler;

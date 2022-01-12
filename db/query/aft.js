/* eslint quotes: ["off"] */
/* eslint operator-linebreak: ["off"] */
/* eslint prefer-template: ["off"] */

module.exports = {
  insertProduction: (args) => ({
    sql:
      "INSERT INTO products(\n" +
      "  model, `serial`, firmware,\n" +
      "  nbiot_model, nbiot_serial, nbiot_firmware, nbiot_imei,\n" +
      "  nbiot_rsrp, nbiot_rsrq, nbiot_rssi, nbiot_tx_power,\n" +
      "  usim, ssim,\n" +
      "  result, memo\n" +
      ")\n" +
      "VALUES (\n" +
      "  :model, :serial, :firmware,\n" +
      "  :nbiotModel, :nbiotSerial, :nbiotFirmware, :nbiotIMEI,\n" +
      "  :nbiotRSRP, :nbiotRSRQ, :nbiotRSSI, :nbiotTxPower,\n" +
      "  :usim, :ssim,\n" +
      "  :result, :memo \n" +
      ")",
    args,
  }),
  checkDuplicate: (args) => ({
    sql:
      "SELECT\n" +
      "  COUNT(CASE WHEN (model=:model AND `serial`=:serial) THEN 1 END) AS dupSerial,\n" +
      "  COUNT(CASE WHEN (nbiot_model=:nbiotModel AND nbiot_serial=:nbiotSerial) THEN 1 END) AS dupNbiotSerial,\n" +
      "  COUNT(CASE WHEN `nbiot_imei`=:nbiotIMEI THEN 1 END) AS dupNbiotIMEI,\n" +
      "  COUNT(CASE WHEN `usim`=:usim THEN 1 END) AS dupUsim\n" +
      "FROM products\n" +
      "WHERE\n" +
      "  (model=:model AND `serial`=:serial)\n" +
      "  OR (nbiot_model=:nbiotModel AND nbiot_serial=:nbiotSerial)\n" +
      "  OR nbiot_imei=:nbiotIMEI\n" +
      "  OR usim=:usim",
    args,
    done: (result) => ({
      dupSerial: (result[0].dupSerial > 0),
      dupNbiotSerial: (result[0].dupNbiotSerial > 0),
      dupNbiotIMEI: (result[0].dupNbiotIMEI > 0),
      dupUsim: (result[0].dupUsim > 0),
    }),
  }),
};

/* eslint quotes: ["off"] */
/* eslint operator-linebreak: ["off"] */
/* eslint prefer-template: ["off"] */

module.exports = {
  insertStatus: (args) => ({
    sql:
      "INSERT INTO `status`(\n" +
      "  ctn, ssimFailure, ssimExist,\n" +
      "  gasLeak, gasLowPressure, lowPower,\n" +
      "  gasOverflow, gasUnused, gasBackflow,\n" +
      "  errorState3, errorState2, errorState1, errorState0,\n" +
      "  kmsState, `count`)\n" +
      "VALUES(\n" +
      "  :ctn, :ssimFailure, :ssimExist,\n" +
      "  :gasLeak, :gasLowPressure, :lowPower,\n" +
      "  :gasOverflow, :gasUnused, :gasBackflow,\n" +
      "  :errorState3, :errorState2, :errorState1, :errorState0,\n" +
      "  :kmsState, :count\n" +
      ")",
    args,
  }),
  getCommand: (args) => ({
    sql:
      "SELECT `no`, cmd, ctn, `data`, status, `timestamp`\n" +
      "FROM nms_commands\n" +
      "WHERE ctn=:ctn AND status=0\n" +
      "LIMIT 1",
    args,
    done: (result) => ((result.length > 0) ? { ...result[0] } : null),
  }),
  updateCommandStatus: (args) => ({
    sql: (() => (
      "UPDATE nms_commands\n" +
      "SET status=:status\n" +
      "WHERE\n" +
      ((args.no != null) ? "`no`=:no" : "ctn=:ctn AND status=1")
    ))(),
    args,
  }),
};

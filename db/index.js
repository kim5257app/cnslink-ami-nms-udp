const MariaDB = require('mariadb');

class Database {
  static instance = null;

  /**
   * @param {{
   *   host: string,
   *   port: number,
   *   database: string,
   *   connectionLimit: number,
   *   user: string,
   *   password: string,
   *   timezone: string,
   * }} opts
   */
  constructor(opts) {
    this.pool = MariaDB.createPool(opts);
  }

  /**
   * @param {{
   *   sql: string,
   *   args: [any] | {[any]},
   *   done?: function,
   *   batch?: boolean,
   * }} opts
   */
  async query({
    sql,
    args,
    done,
    batch,
  }) {
    let conn;

    try {
      conn = await this.pool.getConnection();

      const action = (batch) ? conn.batch : conn.query;
      const namedPlaceholders = !(args instanceof Array);

      let result = await action({ sql, namedPlaceholders }, args);

      if (done != null) {
        result = done(result);
      }

      return result;
    } finally {
      if (conn) { await conn.release(); }
    }
  }

  static getInstance() {
    return this.instance;
  }

  async checkConnection() {
    let conn;

    try {
      conn = await this.pool.getConnection();
    } finally {
      if (conn) { await conn.release(); }
    }
  }

  /**
   * @param {{
   *   host: string,
   *   port: number,
   *   database: string,
   *   connectionLimit: number,
   *   user: string,
   *   password: string,
   *   timezone: string,
   * }} opts
   */
  static async initialize(opts) {
    this.instance = new Database(opts);
    await this.getInstance().checkConnection();
  }
}

module.exports = Database;

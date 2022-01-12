function Error(error) {
  this.result = 'error';
  this.code = '-1';
  this.name = 'ERROR';
  this.message = 'ERROR';

  if (error.result != null) {
    this.result = error.result;
  }

  if (error.code != null) {
    this.code = error.code;
  }

  if (error.name != null) {
    this.name = error.name;
  }

  if (error.message != null) {
    this.message = error.message;
  }
}

Error.prototype = {
  toString() {
    return `[${this.code}]${this.name}: ${this.message}`;
  },
};

module.exports = {
  make(error) {
    return new Error(error);
  },
  throwError(error) {
    throw new Error(error);
  },
  makeFail(name, message, code) {
    // eslint-disable-next-line no-console
    console.log('makeFail:', name, message, code);
    return new Error({
      result: 'failed',
      code: (code != null) ? (code) : (-1),
      name,
      message,
    });
  },
  throwFail(name, message, code) {
    throw new Error({
      result: 'failed',
      code: (code != null) ? (code) : (-1),
      name,
      message,
    });
  },
};

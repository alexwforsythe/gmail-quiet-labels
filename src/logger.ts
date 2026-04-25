enum Level {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export default class Log {
  private static readonly level: Level = Level.DEBUG;

  private static log(level: Level, message: string, fields?: object) {
    if (level < Log.level) {
      return;
    }

    // eslint-disable-next-line no-restricted-globals
    Logger.log({ level, message, ...fields });
  }

  static debug(msg: string, fields?: object) {
    this.log(Level.DEBUG, msg, fields);
  }

  static info(msg: string, fields?: object) {
    this.log(Level.INFO, msg, fields);
  }

  static warn(msg: string, fields?: object) {
    this.log(Level.WARN, msg, fields);
  }

  static error(error: unknown, fields?: object) {
    const err =
      error instanceof Error
        ? error
        : new Error(
            error instanceof Object ? JSON.stringify(error) : `Error: ${error}`,
          );

    this.log(Level.ERROR, err.message, {
      ...fields,
      err: err.toString(),
      stack: err.stack,
    });
  }
}

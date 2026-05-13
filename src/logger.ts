const actionsByFunctionName: Record<string, string> = {
  // GmailApp
  getUserLabels: 'get user labels',
  search: 'search threads',
  moveThreadsToArchive: 'archive threads',
  // PropertiesService
  setProperty: 'set user settings',
  getProperties: 'get user settings',
  deleteProperty: 'clear user state',
  // ScriptApp
  newTrigger: 'create trigger',
  getProjectTriggers: 'get triggers',
  deleteTrigger: 'delete trigger',
};

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

  static error(error: Error | unknown, fields?: object) {
    const err =
      error instanceof Error
        ? error
        : new Error(
            error instanceof Object ? JSON.stringify(error) : `Error: ${error}`,
          );

    this.log(Level.ERROR, err.message, {
      ...fields,
      cause: err.cause,
      stack: err.stack,
    });
  }
}

export function withErrorLogging<T extends object>(target: T) {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') {
        return value;
      }

      return (...args: unknown[]) => {
        try {
          return value.apply(this === receiver ? target : this, args);
        } catch (cause) {
          const propName = prop.toString();
          const err = new Error(
            `Unable to ${actionsByFunctionName[propName] ?? 'perform action'}`,
            { cause },
          );
          Log.error(err);
          throw err;
        }
      };
    },
  });
}

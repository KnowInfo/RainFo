import moment from "moment";

enum LogLevel {
  INFO = 'INFO',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  WARN = 'WARN'
}

export abstract class AbstractLoggerHandler {
  abstract emit(msg: string, level?: LogLevel): void;
}

export class ConsoleHandler extends AbstractLoggerHandler {
  constructor(private options?: object) {
    super();
  }

  emit(msg: string, level: LogLevel = LogLevel.INFO): void {
    switch (level) {
      case LogLevel.INFO:
        console.info(msg);
        break;
      case LogLevel.DEBUG:
        console.debug(msg);
        break;
      case LogLevel.ERROR:
        console.error(msg);
        break;
      case LogLevel.WARN:
        console.warn(msg);
        break;
      default:
        console.log(msg);
    }
  }
}

interface LoggerFormatter {
  format(loggerName: string, msg: string, level: LogLevel): string;
}

class DefaultFormatter implements LoggerFormatter {
  format(loggerName: string, msg: string, level: LogLevel): string {
    return `${moment().format('YYYY-MM-DD HH:mm:ss')} ${loggerName} [${level}]: ${msg}`;
  }
}

class JSONFormatter implements LoggerFormatter {
  format(loggerName: string, msg: string, level: LogLevel): string {
    return JSON.stringify({
      time: moment().format('YYYY-MM-DD HH:mm:ss'),
      loggerName,
      level,
      msg
    });
  }
}

export class HttpHandler extends AbstractLoggerHandler {
  private formatter: LoggerFormatter;

  constructor(private options: { url: string; method?: 'POST' | 'GET'; format?: 'json' }) {
    super();
    this.formatter = options.format === 'json' ? new JSONFormatter() : new DefaultFormatter();
  }

  async emit(msg: string, level: LogLevel = LogLevel.INFO): Promise<void> {
    try {
      let formattedMessage: string;
      formattedMessage = this.formatter.format('HttpHandler', msg, level);

      const response = await fetch(this.options.url, {
        method: this.options.method || 'POST',
        body: formattedMessage, // 使用字符串形式的 formattedMessage
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to emit log: ${error}`);
    }
  }
}

export class Logger {
  static readonly DEBUG = LogLevel.DEBUG;
  static readonly INFO = LogLevel.INFO;
  static readonly ERROR = LogLevel.ERROR;

  private loggerName: string;
  private handler: AbstractLoggerHandler;
  private formatter: LoggerFormatter;
  private _debug: boolean;

  constructor(name: string, handler: AbstractLoggerHandler) {
    this.loggerName = name;
    this.handler = handler;
    this._debug = false;
    this.formatter = new DefaultFormatter();
  }

  setDebug(debug: boolean): void {
    this._debug = debug;
  }

  setLoggerHandler(handler: AbstractLoggerHandler): void {
    if (handler instanceof AbstractLoggerHandler) {
      this.handler = handler;
    }
  }

  private static getFormattedMessage(loggerName: string, msg: any[], level: LogLevel): string {
    return `${moment().format()} ${loggerName} [${level}]: ${Logger.messageStringify(msg)}`;
  }

  private static messageStringify(...msg: any[]): string {
    return msg.map(item => item instanceof Error ? item.toString() : JSON.stringify(item)).join(', ');
  }

  info(...msg: any[]): void {
    const messageString = Logger.messageStringify(msg);
    const formattedMessage = this.formatter.format(this.loggerName, messageString, LogLevel.INFO);
    this.handler.emit(typeof formattedMessage === 'string' ? formattedMessage : JSON.stringify(formattedMessage), LogLevel.INFO);
  }

  debug(...msg: any[]): void {
    if (!this._debug) {
      return;
    }
    const messageString = Logger.messageStringify(msg);
    const formattedMessage = this.formatter.format(this.loggerName, messageString, LogLevel.DEBUG);
    this.handler.emit(typeof formattedMessage === 'string' ? formattedMessage : JSON.stringify(formattedMessage), LogLevel.DEBUG);
  }

  error(...msg: any[]): void {
    const messageString = Logger.messageStringify(msg);
    const formattedMessage = this.formatter.format(this.loggerName, messageString, LogLevel.ERROR);
    this.handler.emit(typeof formattedMessage === 'string' ? formattedMessage : JSON.stringify(formattedMessage), LogLevel.ERROR);
  }

  static createLogger(loggerName: string, handlerName: 'console' | 'http' = 'console', handlerOptions: { url?: string, method?: string, formatter?: 'json' } = {}): Logger {
    const handlers: { [key: string]: new (options: any) => AbstractLoggerHandler } = { console: ConsoleHandler, http: HttpHandler };
    const logger = new Logger(loggerName, new handlers[handlerName](handlerOptions));
    logger.formatter = handlerOptions.formatter === 'json' ? new JSONFormatter() : new DefaultFormatter();
    return logger;
  }
}

/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

export enum LogLevel {
  test = 0,
  trace = 1,
  debug = 2,
  info = 3,
  warn = 4,
  error = 5,
  fatal = 6,
  off = 7,
}

export enum RemoteLogLevel {
  disable = 0,
  enable = 1,
}

export interface Logger {
  logLevel: LogLevel

  test(message: string, data?: Record<string, any>): void
  trace(message: string, data?: Record<string, any>): void
  debug(message: string, data?: Record<string, any>): void
  info(message: string, data?: Record<string, any>): void
  warn(message: string, data?: Record<string, any>): void
  error(message: string, data?: Record<string, any>): void
  fatal(message: string, data?: Record<string, any>): void
}

const replaceError = (_: unknown, value: unknown) => {
  if (value instanceof Error) {
    const newValue = Object.getOwnPropertyNames(value).reduce(
      (obj, propName) => {
        obj[propName] = (value as unknown as Record<string, unknown>)[propName]
        return obj
      },
      { name: value.name } as Record<string, unknown>
    )
    return newValue
  }

  return value
}

// class LogBuffer {
//   public maxSize: number
//   public flushInterval: number
//   public onFlush: any
//   public logs: any
//   public flushTimer: any
//   constructor(maxSize: number, flushInterval: number, onFlush: any) {
//     this.maxSize = maxSize // Maximum number of logs to store in the buffer
//     this.flushInterval = flushInterval // Time interval (in milliseconds) to flush logs to the server
//     this.onFlush = onFlush // Callback function to send logs to the server

//     this.logs = []
//     this.flushTimer = null

//     // Start a timer to flush logs at regular intervals
//     this.startFlushTimer()
//   }

//   addLog(log: any) {
//     this.logs.push(log)

//     // Check if the buffer size exceeds the maximum size
//     if (this.logs.length >= this.maxSize) {
//       this.flushLogs()
//     }
//   }

//   flushLogs() {
//     if (this.logs.length > 0) {
//       // Call the callback function to send logs to the server
//       this.onFlush(this.logs)

//       // Clear the logs array
//       this.logs = []
//     }
//   }

//   startFlushTimer() {
//     this.flushTimer = setInterval(() => {
//       this.flushLogs()
//     }, this.flushInterval)
//   }

//   stopFlushTimer() {
//     clearInterval(this.flushTimer)
//   }
// }

// Example usage:

// Callback function to send logs to the server
// const sendLogsToServer = (logs) => {
//   // Replace this with your actual backend API call to send logs
//   console.log('Sending logs to server:', logs);
// };

// Create a log buffer with a maximum size of 10 logs and a flush interval of 5000 milliseconds (5 seconds)
//const logBuffer = new LogBuffer(10, 5000, sendLogsToServer)

// Add logs to the buffer
// logBuffer.addLog('Log 1');
// logBuffer.addLog('Log 2');
// logBuffer.addLog('Log 3');

// Stop the flush timer (optional)
// logBuffer.stopFlushTimer();

export class AppConsoleLogger implements Logger {
  public remoteLogLevel: RemoteLogLevel
  public logLevel: LogLevel
  public credentials: any
  public logBuffer: any
  public maxSize: number
  public flushInterval: number
  public logs: any
  public flushTimer: any
  // Map our log levels to console levels
  private consoleLogMap = {
    [LogLevel.test]: 'log',
    [LogLevel.trace]: 'log',
    [LogLevel.debug]: 'debug',
    [LogLevel.info]: 'info',
    [LogLevel.warn]: 'warn',
    [LogLevel.error]: 'error',
    [LogLevel.fatal]: 'error',
  } as const

  public constructor(
    logLevel: LogLevel = LogLevel.off,
    enableRemoteLog: RemoteLogLevel = RemoteLogLevel.disable,
    credentials: any
  ) {
    this.logLevel = logLevel
    this.remoteLogLevel = enableRemoteLog
    this.credentials = credentials
    /** Buffer Logs Implementation*/
    this.maxSize = 30
    this.flushInterval = 5000
    this.logs = []
    this.flushTimer = null
    this.startFlushTimer()
    /** --------------  */
  }

  public addLog(log: any) {
    this.logs.push(log)

    // Check if the buffer size exceeds the maximum size
    if (this.logs.length >= this.maxSize) {
      this.flushLogs()
    }
  }

  public flushLogs() {
    if (this.logs.length > 0) {
      // Call the callback function to send logs to the server
      this.logRequestToServer(this.logs)

      // Clear the logs array
      this.logs = []
    }
  }

  public startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushLogs()
    }, this.flushInterval)
  }

  public test(message: string, data?: Record<string, any>): void {
    if (this.remoteLogLevel === RemoteLogLevel.enable) {
      this.addLog(message)
      this.addLog(JSON.stringify(data))
      //this.logRequestToServer(message, data)
    }
    console.log(message, data)
  }

  public trace(message: string, data?: Record<string, any>): void {
    if (this.remoteLogLevel === RemoteLogLevel.enable) {
      this.addLog(message)
      this.addLog(JSON.stringify(data))
    }
    console.log(message, data)
  }

  public debug(message: string, data?: Record<string, any>): void {
    if (this.remoteLogLevel === RemoteLogLevel.enable) {
      this.addLog(message)
      this.addLog(JSON.stringify(data))
    }
    console.debug(message, data)
  }

  public info(message: string, data?: Record<string, any>): void {
    if (this.remoteLogLevel === RemoteLogLevel.enable) {
      this.addLog(message)
      this.addLog(JSON.stringify(data))
    }
    console.info(message, data)
  }
  public warn(message: string, data?: Record<string, any>): void {
    if (this.remoteLogLevel === RemoteLogLevel.enable) {
      this.addLog(message)
      this.addLog(JSON.stringify(data))
    }
    console.warn(message, data)
  }
  public error(message: string, data?: Record<string, any>): void {
    if (this.remoteLogLevel === RemoteLogLevel.enable) {
      this.addLog(message)
      this.addLog(JSON.stringify(data))
    }
    console.error(message, data)
  }

  public fatal(message: string, data?: Record<string, any>): void {
    if (this.remoteLogLevel === RemoteLogLevel.enable) {
      this.addLog(message)
      this.addLog(JSON.stringify(data))
    }
    console.log(message, data)
  }

  public log(level: Exclude<LogLevel, LogLevel.off>, message: string, data?: Record<string, any>): void {
    // Get console method from mapping
    const consoleLevel = this.consoleLogMap[level]

    // Get logger prefix from log level names in enum
    const prefix = LogLevel[level].toUpperCase()

    // Return early if logging is not enabled for this level
    if (!this.isEnabled(level)) {
      console.log('logger disabled')
      return
    }

    // Log, with or without data
    if (data) {
      console[consoleLevel](
        `${prefix}: ${new Date().toISOString()} - ${message}`,
        JSON.stringify(data, replaceError, 2)
      )
    } else {
      console[consoleLevel](`${prefix}:  ${new Date().toISOString()} - ${message}`)
    }
  }

  private isEnabled(logLevel: LogLevel) {
    return logLevel >= this.logLevel
  }

  private logRequestToServer(logs: any) {
    console.log('Buffer Calling')
    const messagePayload = {
      timestamp: new Date(),
      label: this.consoleLogMap[LogLevel.debug], // is not required need to discuss
      message: logs.join(''),
    }
    const serviceURL = 'https://dev2-api.instnt.org'
    const url = serviceURL + '/public/walletlogs/'
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      mode: 'cors',
      body: JSON.stringify(messagePayload),
    })
  }
}

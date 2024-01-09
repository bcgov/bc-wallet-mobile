import { BaseLogger } from '@aries-framework/core'
import { logger, transportFunctionType, consoleTransport } from 'react-native-logs'
import axios from 'axios'
import { DeviceEventEmitter, EmitterSubscription } from 'react-native'

// Next Tasks
// - Add developer setting;
// - Convert to NPM package;
// - Add warning screen when on;
// - Add timer to disable remote logging after 24h;
// - Add event listener mechanics to enable/disable remote logging;

// export declare enum LogLevel {
//   test = 0,
//   trace = 1,
//   debug = 2,
//   info = 3,
//   warn = 4,
//   error = 5,
//   fatal = 6,
//   off = 7
// }

// const defaultConfig = {
//   levels: {
//     debug: 0,
//     info: 1,
//     warn: 2,
//     error: 3,
//   },
//   severity: "debug",
//   transport: consoleTransport,
//   transportOptions: {
//     colors: {
//       info: "blueBright",
//       warn: "yellowBright",
//       error: "redBright",
//     },
//   },
//   async: true,
//   dateFormat: "time",
//   printLevel: true,
//   printDate: true,
//   enabled: true,
// };

export interface RemoteLoggerOptions {
  lokiUrl?: string
  lokiLabels?: Record<string, string>
}

type LokiTransportProps = {
  msg: any
  rawMsg: any
  level: {
    severity: number
    text: string
  }
  options?: RemoteLoggerOptions
}

export enum RemoteLoggerEventTypes {
  ENABLE_REMOTE_LOGGING = 'RemoteLogging.Enable',
}

const lokiTransport: transportFunctionType = (props: LokiTransportProps) => {
  // Loki requires a timestamp with nanosecond precision
  // however Date.now() only returns milliseconds precision.
  const timestampEndPadding = '000000'

  if (!props.options) {
    throw Error('props.options is required')
  }

  if (!props.options.lokiUrl) {
    throw Error('props.options.lokiUrl is required')
  }

  if (!props.options.lokiLabels) {
    throw Error('props.options.labels is required')
  }

  if (!props.options.lokiUrl) {
    throw new Error('Loki URL is missing')
  }

  const { lokiUrl, lokiLabels } = props.options
  const { message, data } = props.rawMsg.pop()
  const payload = {
    streams: [
      {
        stream: {
          job: 'react-native-logs',
          level: props.level.text,
          ...lokiLabels,
        },
        values: [[`${Date.now()}${timestampEndPadding}`, JSON.stringify({ message, data })]],
      },
    ],
  }

  axios
    .post(lokiUrl, payload)
    .then((res) => {
      if (res.status !== 204) {
        console.warn(`Expected Loki to return 204, received ${res.status}`)
      }
    })
    .catch((error) => {
      console.error(`Error while sending to Loki, ${error}`)
    })
}

export class RemoteLogger extends BaseLogger {
  private readonly autoDisableRemoteLoggingIntervalInMs: number = 3 * 60 * 60 * 1000 // 3 hours in milliseconds
  private _remoteLoggingEnabled = false
  private _sessionId: number
  private remoteLoggingAutoDisableTimer: ReturnType<typeof setTimeout> | undefined
  private eventListener: EmitterSubscription | undefined
  private log: any
  private options: RemoteLoggerOptions
  private config = {
    levels: {
      test: 0,
      trace: 0,
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4,
    },
    severity: 'debug',
    async: true,
    dateFormat: 'time',
    printDate: false,
  }

  constructor(options: RemoteLoggerOptions) {
    super()

    this._sessionId = Math.floor(100000 + Math.random() * 900000)
    this.options = options
    this.configureLogger()
  }

  get sessionId(): number {
    return this._sessionId
  }

  get remoteLoggingEnabled(): boolean {
    return this._remoteLoggingEnabled
  }

  set remoteLoggingEnabled(value: boolean) {
    this._remoteLoggingEnabled = value
    this.configureLogger()
  }

  private configureLogger() {
    const transportOptions = {}
    const transport = [consoleTransport]
    const config = {
      ...this.config,
      transport,
      transportOptions,
    }

    if (this.remoteLoggingEnabled && this.options.lokiUrl) {
      transport.push(lokiTransport)
      config['transportOptions'] = {
        lokiUrl: this.options.lokiUrl,
        lokiLabels: {
          ...this.options.lokiLabels,
          sessionId: this.sessionId,
        },
      }
      this.remoteLoggingAutoDisableTimer = setTimeout(() => {
        this.remoteLoggingEnabled = false
      }, this.autoDisableRemoteLoggingIntervalInMs)
    }

    this.log = logger.createLogger<'test' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>(config)
  }

  public startEventListeners() {
    this.eventListener = DeviceEventEmitter.addListener(RemoteLoggerEventTypes.ENABLE_REMOTE_LOGGING, (value) => {
      this.remoteLoggingEnabled = value
    })
  }

  public stopEventListeners() {
    this.eventListener = undefined
  }

  public test(message: string, data?: Record<string, any> | undefined): void {
    this.log.test({ message, data })
  }

  public trace(message: string, data?: Record<string, any> | undefined): void {
    this.log.trace({ message, data })
  }

  public debug(message: string, data?: Record<string, any> | undefined): void {
    this.log.debug({ message, data })
  }

  public info(message: string, data?: Record<string, any> | undefined): void {
    this.log.info({ message, data })
  }

  public warn(message: string, data?: Record<string, any> | undefined): void {
    this.log.warn({ message, data })
  }

  public error(message: string, data?: Record<string, any> | undefined): void {
    this.log.error({ message, data })
  }

  public fatal(message: string, data?: Record<string, any> | undefined): void {
    this.log.fatal({ message, data })
  }
}

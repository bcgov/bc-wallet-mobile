import { RemoteLogger, RemoteLoggerOptions } from '@bifold/remote-logs'
import { LogLevel } from '@credo-ts/core'
import Config from 'react-native-config'
import {
  getApplicationName,
  getBuildNumber,
  getSystemName,
  getSystemVersion,
  getVersion,
} from 'react-native-device-info'
import { autoDisableRemoteLoggingIntervalInMinutes } from '../constants'

const baseOptions: RemoteLoggerOptions = {
  lokiUrl: Config.REMOTE_LOGGING_URL,
  lokiLabels: {
    application: getApplicationName().toLowerCase(),
    version: `${getVersion()}-${getBuildNumber()}`,
    system: `${getSystemName()} v${getSystemVersion()}`,
  },
  autoDisableRemoteLoggingIntervalInMinutes,
}

/** Map string (from env) to LogLevel enum; unknown values
 * fallback to debug */
const parseEnvLogLevel = (value?: string): LogLevel => {
  if (!value) return LogLevel.debug
  switch (value.toLowerCase()) {
    case 'fatal':
      return LogLevel.fatal
    case 'error':
      return LogLevel.error
    case 'warn':
    case 'warning':
      return LogLevel.warn
    case 'info':
      return LogLevel.info
    case 'trace':
    case 'test':
    case 'debug':
      return LogLevel.debug
    default:
      return LogLevel.debug
  }
}

/** Factory for creating a new app-specific RemoteLogger instance
 * If logLevel param omitted, use Config.LOG_LEVEL env mapping.
 */
export const createAppLogger = (extraLabels: Record<string, string> = {}, logLevel?: LogLevel): RemoteLogger => {
  const effectiveLevel = logLevel ?? parseEnvLogLevel(Config.LOG_LEVEL)
  return new RemoteLogger({
    ...baseOptions,
    lokiLabels: { ...baseOptions.lokiLabels, ...extraLabels },
    logLevel: effectiveLevel,
  })
}

// (Optional) Named singleton for legacy code paths;
// prefer injecting createAppLogger() instead.
export const appLogger = createAppLogger()

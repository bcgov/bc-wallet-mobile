import type { BifoldError } from '@bifold/core'
import { RemoteLogger, RemoteLoggerOptions, lokiTransport } from '@bifold/remote-logs'
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
import { generateReferenceCode } from './reference-code'

const baseOptions: RemoteLoggerOptions = {
  lokiUrl: Config.REMOTE_LOGGING_URL,
  lokiLabels: {
    application: getApplicationName().toLowerCase(),
    version: `${getVersion()}-${getBuildNumber()}`,
    system: `${getSystemName()} v${getSystemVersion()}`,
  },
  autoDisableRemoteLoggingIntervalInMinutes,
}

/**
 * Maps string (from env) to LogLevel enum.
 * Unknown values fallback to debug.
 */
const parseEnvLogLevel = (value?: string): LogLevel => {
  if (!value) {
    return LogLevel.debug
  }
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

/** Factory for creating a new app-specific RemoteLogger instance.
 * If the logLevel parameter is omitted, the Config.LOG_LEVEL env mapping is used.
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

/**
 * Sends a problem report to Loki and returns a user-facing reference code.
 *
 * The reference code is embedded in the report payload as `report_id`, so support
 * can locate the incident later by searching the `incident-report` job for it
 * (e.g. in Grafana: `{job="incident-report"} |= "<code>"`). It is intentionally
 * placed in the log body rather than as a Loki label to avoid high label
 * cardinality.
 *
 * Reporting is best-effort: any transport failure is swallowed so the user is
 * always given a code to share, even when the network/Loki is unavailable.
 *
 * @param error - the error being reported
 * @returns the reference code to surface to the user
 */
export const reportProblem = (error: BifoldError): string => {
  const referenceCode = generateReferenceCode()
  const { title, description, code, message } = error

  try {
    if (baseOptions.lokiUrl) {
      lokiTransport({
        msg: title,
        rawMsg: [{ message: title, data: { description, code, message, report_id: referenceCode } }],
        level: { severity: 3, text: 'error' },
        options: {
          lokiUrl: baseOptions.lokiUrl,
          lokiLabels: baseOptions.lokiLabels,
          job: 'incident-report',
        },
      })
    }
  } catch (e) {
    // Never let a reporting failure prevent the user from getting their code.
    appLogger.error?.('Failed to send problem report to Loki', e as Error)
  }

  return referenceCode
}

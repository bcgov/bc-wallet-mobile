import { AppError } from '@/errors'
import { RemoteLogger, RemoteLoggerOptions, lokiTransport } from '@bifold/remote-logs'
import { LogLevel } from '@credo-ts/core'
import Config from 'react-native-config'
import {
  getApplicationName,
  getBuildNumber,
  getDeviceId,
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
    model: getDeviceId(), // NOTE (bm): Not user-friendly model name, actual device model code, ie: iPhone 14 Pro shows up as iPhone 15,2
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
 * @param problem - the problem being reported
 * @param options.includeDeviceDetails - when false, the app `version` and OS `system` labels are
 *   omitted so a user can submit a report without sharing device details (defaults to true to
 *   preserve existing error-report behaviour)
 * @returns the reference code to surface to the user
 */
export const reportProblem = (
  problem: {
    title: string // Usually the alert title
    description: string // Usually the alert description
    error?: AppError
  },
  options?: { includeDeviceDetails?: boolean }
): string => {
  const referenceCode = generateReferenceCode()
  const { title, description, error } = problem
  // const { title, description, code, message, stack } = error
  const { includeDeviceDetails = true } = options ?? {}

  // Drop the app version / OS labels when the user opts out; keep the application name so support
  // still knows which app the report came from.
  const lokiLabels = includeDeviceDetails ? baseOptions.lokiLabels : { application: getApplicationName().toLowerCase() }

  const lokiPayload = {
    message: title,
    data: {
      description,
      code: error?.statusCode, // Note: Backwards compatibility - included in error (statusCode)
      message: error?.message, // Note: Backwards compatibility - included in error
      error: error?.toJSON(),
      report_id: referenceCode,
      stack: error?.stack, // Note: Backwards compatibility - included in error
    },
  }

  // Only attach `stack` when the error actually carries one — user-initiated reports have no real
  // trace, so the field is omitted rather than logging meaningless construction frames.
  if (!error?.stack) {
    delete lokiPayload.data.stack
  }

  try {
    if (baseOptions.lokiUrl) {
      lokiTransport({
        msg: title,
        rawMsg: [lokiPayload],
        level: { severity: 3, text: 'error' },
        options: {
          lokiUrl: baseOptions.lokiUrl,
          lokiLabels,
          job: 'incident-report',
        },
      })
    }
  } catch (e: any) {
    // Never let a reporting failure prevent the user from getting their code.
    appLogger.error?.('Failed to send problem report to Loki', e)
  }

  return referenceCode
}

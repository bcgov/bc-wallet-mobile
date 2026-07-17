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

interface ReportProblem {
  /**
   * The title of the problem being reported.
   * Usually the title of the error modal, but can be any string that describes the problem.
   */
  title: string
  /**
   * The description of the problem being reported.
   * Usually the description of the error modal, but can be any string that provides more context about the problem.
   */
  description: string
  /**
   * The error code associated with the problem being reported.
   *
   * @see USER_REPORT_ERROR_CODE for the default value when there is no error object available.
   * @see AppError.statusCode for the error code when there is an error object available.
   */
  code: number
  /**
   * The error object associated with the problem being reported.
   * This is optional and can be omitted if there is no error object available.
   */
  error?: AppError
  /**
   * The install ID represents the unique identifier for the app installation on the user's device.
   * @see store.bcsc.reportUUID for the source of this value.
   */
  installId?: string
}

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
export const reportProblem = (problem: ReportProblem, options?: { includeDeviceDetails?: boolean }): string => {
  const referenceCode = generateReferenceCode()
  const { title, description, error, code } = problem
  const { includeDeviceDetails = true } = options ?? {}

  // Drop the app version / OS labels when the user opts out; keep the application name so support
  // still knows which app the report came from.
  const lokiLabels = includeDeviceDetails ? baseOptions.lokiLabels : { application: getApplicationName().toLowerCase() }

  try {
    if (baseOptions.lokiUrl) {
      lokiTransport({
        msg: title,
        rawMsg: [
          {
            message: title,
            data: {
              code,
              description,
              message: error?.message, // TODO (MD): Deprecate - included in `error`
              error: error?.toJSON(),
              report_id: referenceCode, // this report problem - ie: "7K2P-9XQF"
              install_id: problem.installId, // this app installation - ie: "f3e2c1d4-5b6a-7c8d-9e0f-1a2b3c4d5e6f"

              // Only attach `stack` when the error actually carries one — user-initiated reports have no real
              // trace, so the field is omitted rather than logging meaningless construction frames.
              ...(error?.stack ? { stack: error.stack } : {}), // TODO (MD): Deprecate - included in `error`
            },
          },
        ],
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

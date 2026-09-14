import { AppError } from '@/errors'
import { RemoteLogger, RemoteLoggerOptions } from '@bifold/remote-logs'
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
import { createReportProblemLokiPayload, reportProblemLokiTransport } from './report-problem'

export interface ReportProblem {
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
   * Usually the status code of the error, but can be any number that identifies the problem. ie: USER_REPORT_ERROR_CODE
   */
  code: number
  /**
   * The error object associated with the problem being reported.
   * This is optional and can be omitted if there is no error object available.
   */
  error?: AppError
  /**
   * The install ID represents the unique identifier for the app installation on the user's device.
   * @see `store.bcsc.installId` for the source of this value.
   */
  installId?: string
  /**
   * The remote logging ID represents the unique identifier for the remote logging session.
   * This is optional and can be omitted if there is no remote logging session available.
   * @see `store.developer.remoteDebugging.sessionId` for the source of this value.
   */
  sessionId?: number
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
      return LogLevel.trace
    case 'test':
      return LogLevel.test
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
 * TODO (MD): Consider moving this to `utils/report-problem.ts`
 *
 * @param problem - the problem being reported
 * @returns the reference code to surface to the user
 */
export const reportProblem = (problem: ReportProblem): string => {
  const reportId = generateReferenceCode()

  if (!baseOptions.lokiUrl) {
    appLogger.warn(`[ReportProblem] Loki URL not configured. Skipping report for problem: ${problem.title}`)
    return reportId
  }

  const payload = createReportProblemLokiPayload(reportId, problem)

  reportProblemLokiTransport(baseOptions.lokiUrl, payload, appLogger)

  return reportId
}

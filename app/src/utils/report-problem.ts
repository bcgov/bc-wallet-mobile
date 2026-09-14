import { AppError } from '@/errors'
import { RemoteLogger } from '@bifold/remote-logs'
import axios from 'axios'
import {
  getApplicationName,
  getBuildNumber,
  getDeviceId,
  getModel,
  getSystemName,
  getVersion,
} from 'react-native-device-info'
import { ReportProblem } from './logger'

type ReportProblemLokiPayload = ReturnType<typeof createReportProblemLokiPayload>

const LOKI_REPORT_PROBLEM_JOB = 'incident-report'
const LOKI_REPORT_PROBLEM_LOG_LEVEL = 'error'
// List of error context keys that should be flattened into the top-level of the Loki payload.
const FLATTENED_APP_ERROR_CONTEXT_KEYS = new Set([
  'screen',
  'http_route',
  'http_method',
  'http_status',
  'http_response_size',
  'http_request_size',
])

/**
 * Reports a problem to the Loki logging service.
 * @param lokiUrl The URL of the Loki logging service.
 * @param payload The payload to send to the Loki logging service.
 * @param logger The remote logger to use for logging.
 * @returns void
 */
export const reportProblemLokiTransport = (
  lokiUrl: string,
  payload: ReportProblemLokiPayload,
  logger: RemoteLogger
) => {
  const [credentials, href] = lokiUrl.split('@')
  const [username, password] = credentials.split('//')[1].split(':')
  const protocol = credentials.split('//')[0]

  axios
    .post(`${protocol}//${href}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
    })
    .then((response) => {
      if (response.status !== 204) {
        logger.error(`[LokiTransport] Failed to report problem to Loki. Status: ${response.status}}`, response.data)
      }
    })
    .catch((error) => {
      logger.error('[LokiTransport] Failed to report problem to Loki.', error)
    })
}

/**
 * Creates a Loki payload for reporting a problem.
 * @param reportId The unique identifier for the report.
 * @param problem The problem to report.
 * @returns The Loki payload for reporting the problem.
 */
export const createReportProblemLokiPayload = (reportId: string, problem: ReportProblem) => {
  // Loki expects the timestamp to be in nanoseconds
  const lokiTimestampNanoseconds = `${Date.now()}000000`

  const payload: Record<string, unknown> = {
    report_id: reportId, // this report problem - ie: "7K2P-9XQF"
    install_id: problem.installId, // this app installation - ie: "f3e2c1d4-5b6a-7c8d-9e0f-1a2b3c4d5e6f"
    session_id: problem.sessionId, // this remote logging session - ie: 1234567890

    message: problem.title, // ie: "Something went wrong"
    description: problem.description, // ie: "The app crashed when I tried to do X"
    code: problem.code,

    ..._flattenAppError(problem.error),
  }

  return {
    streams: [
      {
        stream: {
          job: LOKI_REPORT_PROBLEM_JOB,
          level: LOKI_REPORT_PROBLEM_LOG_LEVEL,
          environment: __DEV__ ? 'development' : 'production',
          application: getApplicationName().toLowerCase(),
          version: getVersion(),
          build: getBuildNumber(),
          system: getSystemName().toLowerCase(),
          device: getDeviceId(),
          model: getModel(),
        },
        values: [[lokiTimestampNanoseconds, JSON.stringify(payload)]],
      },
    ],
  }
}

/**
 * Flattens the context of an AppError into a top-level object for easier logging.
 * @param error The AppError to flatten.
 * @returns A flattened object containing the error's context.
 */
const _flattenAppError = (error?: AppError) => {
  if (!error) {
    return {}
  }

  const flattened: Record<string, unknown> = {
    error_code: error.code,
    error_status_code: error.statusCode,
    error_app_event: error.appEvent,
    error_message: error.message,
    error_technical_message: error.technicalMessage,
  }

  for (const key of FLATTENED_APP_ERROR_CONTEXT_KEYS) {
    if (error.context?.[key] !== undefined) {
      flattened[key] = error.context[key]
    }
  }

  // Append the error json to the end of the flattened object to expose additional context
  flattened.error_json = error.toJSON()

  return flattened
}

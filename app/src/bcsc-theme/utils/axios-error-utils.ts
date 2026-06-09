import { AppError, ErrorDefinition, ErrorRegistry } from '@/errors'
import { getErrorDefinitionFromAppEventCode } from '@/errors/errorHandler'
import { AppEventCode, isAppEventCode } from '@/events/appEventCode'
import { AxiosError } from 'axios'

enum AxiosErrorCode {
  // Unable to connect to the server (e.g. no internet, CORS issues, DNS errors)
  NETWORK_ERROR = 'ERR_NETWORK',
  // The request was made but the server responded with a 4xx status code (client error)
  BAD_REQUEST = 'ERR_BAD_REQUEST',
  // The request was made but the server responded with a 5xx status code (server error)
  BAD_RESPONSE = 'ERR_BAD_RESPONSE',
  // The request was made but was aborted (e.g. timeout, cancellation)
  ECONNABORTED = 'ECONNABORTED',
}

interface LogAxiosErrorOptions {
  /**
   * The axios error to log
   * @type {AxiosError<any>}
   */
  error: AxiosError<any>
  /**
   * Suppress stack trace in logs
   * @type {boolean}
   */
  suppressStackTrace: boolean
}

export const formatIasAxiosResponseError = (axiosError: AxiosError<any>): AxiosError => {
  if (
    typeof axiosError.response?.data?.error === 'string' &&
    typeof axiosError.response?.data?.error_description === 'string'
  ) {
    axiosError.code = axiosError.response.data.error
    axiosError.message = axiosError.response.data.error_description
  }

  return axiosError
}

/**
 * Summarize an HTTP body for logging. Request/response bodies can be multi-MB binary
 * Buffers (e.g. an evidence upload's photo/video bytes); logging them verbatim expands the
 * Buffer to a per-byte JSON number array and can exhaust memory. Replace binary or very
 * large payloads with a short descriptor; pass small values through unchanged.
 *
 * @param body - The request or response body to summarize
 * @returns The body unchanged, or a size descriptor for binary/oversized payloads
 */
export const summarizeLoggedBody = (body: unknown): unknown => {
  if (body == null) {
    return body
  }

  // ArrayBuffer.isView covers Buffer (a Uint8Array subclass), typed arrays, and DataView.
  if (ArrayBuffer.isView(body)) {
    return `[binary ${(body as ArrayBufferView).byteLength} bytes]`
  }

  if (body instanceof ArrayBuffer) {
    return `[binary ${body.byteLength} bytes]`
  }

  if (typeof body === 'string' && body.length > 2048) {
    return `[string ${body.length} chars]`
  }

  return body
}

/**
 * Outputs detailed information about an AxiosError to the provided logger.
 *
 * @see bcsc-theme/api/client.ts
 * @param {LogAxiosErrorOptions} options - The options for logging the error
 * @returns {*} {void}
 */
export const formatAxiosErrorForLogger = (options: LogAxiosErrorOptions): Record<string, unknown> => {
  const errorDetails: Record<string, unknown> = {
    name: options.error.name,
    code: options.error.code,
    message: options.error.message,
    method: options.error.config?.method?.toUpperCase(),
    status: options.error.response?.status,
    url: options.error.config?.url,
    baseURL: options.error.config?.baseURL,
    isTimeout: options.error.code === AxiosErrorCode.ECONNABORTED,
    isNetworkError: isNetworkError(options.error),
  }

  if (options.error.config) {
    errorDetails.request = {
      headers: options.error.config.headers,
      params: options.error.config.params,
      data: summarizeLoggedBody(options.error.config.data),
    }
  }

  if (options.error.response) {
    errorDetails.response = {
      statusText: options.error.response.statusText,
      headers: options.error.response.headers,
      data: summarizeLoggedBody(options.error.response.data),
    }
  }

  // Include stack trace unless suppressed
  if (options.error.stack && !options.suppressStackTrace) {
    errorDetails.stack = options.error.stack
  }

  return errorDetails
}

/**
 * Determines if the provided error is a network error.
 *
 * @param {unknown} error - The error to check
 * @returns {*} {boolean} True if the error is a network error, false otherwise.
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return (error as any)?.isNetworkError === true || error.code === AxiosErrorCode.NETWORK_ERROR
  }

  if (error instanceof AppError) {
    return error.appEvent === AppEventCode.NO_INTERNET
  }

  return false
}

/**
 * Maps Axios error codes to predefined AppError definitions based on the application's error registry.
 *
 * @param errorCode - The error code from an AxiosError to map to an AppError definition
 * @returns An ErrorDefinition from the ErrorRegistry if a mapping exists, or null if no mapping is found
 */
export const getAxiosErrorDefinition = (errorCode?: string): ErrorDefinition | null => {
  switch (errorCode) {
    case AxiosErrorCode.ECONNABORTED:
      return ErrorRegistry.SERVER_TIMEOUT
    case AxiosErrorCode.NETWORK_ERROR:
      return ErrorRegistry.NO_INTERNET
    case AxiosErrorCode.BAD_REQUEST:
      return ErrorRegistry.BAD_REQUEST
    case AxiosErrorCode.BAD_RESPONSE:
      return ErrorRegistry.SERVER_ERROR
  }

  return null
}

/**
 * Converts an AxiosError into a structured AppError based on the error code and app event mappings.
 *
 * @param error - The AxiosError to convert
 * @returns The resulting AppError with structured information and cause
 */
export const getAppErrorFromAxiosError = (error: AxiosError): AppError => {
  const errorCode = error.code
  const errorDefinition = getAxiosErrorDefinition(errorCode) ?? getErrorDefinitionFromAppEventCode(errorCode)

  let appError: AppError

  // If we have a predefined error definition for this app event code, use it to create the AppError
  if (errorDefinition) {
    appError = AppError.fromErrorDefinition(errorDefinition, { cause: error })
  } else if (isAppEventCode(errorCode)) {
    // Create a generic AppError for known event codes that don't have a predefined error definition
    appError = new AppError(
      `Server Error: Unregistered error code (${errorCode})`,
      {
        ...ErrorRegistry.UNKNOWN_SERVER_ERROR,
        appEvent: errorCode,
      },
      { cause: error }
    )
  } else {
    appError = new AppError(`Server Error: Unknown error code (${errorCode})`, ErrorRegistry.UNKNOWN_SERVER_ERROR, {
      cause: error,
    })
  }
  // http://x.com is a dummy domain so relative paths still parse correctly
  appError.url = error.config?.url ? new URL(error.config.url, 'https://x.com').pathname : undefined
  appError.method = error.config?.method?.toUpperCase()

  return appError
}

/**
 * Redacted, structured network-failure diagnostics suitable for remote logging.
 *
 * Intentionally minimal: never includes auth headers, request/response bodies, or
 * full URLs — pre-signed upload URLs carry credentials in the query string, so only
 * the bare host is ever safe to log.
 */
export interface RedactedNetworkDiagnostics {
  /** The axios error code, e.g. 'ERR_NETWORK', 'ECONNABORTED'. */
  axiosCode?: string
  /** The HTTP status, if a response was received (absent for transport-level failures). */
  httpStatus?: number
  /** The request method, upper-cased. */
  method?: string
  /** The target host only — never the path, query, or fragment. */
  host?: string
}

/**
 * Extracts the host from a URL string, discarding path, query, and fragment.
 *
 * Pre-signed upload URLs embed credentials (SAS tokens, signatures) in the query
 * string, so only the host is ever safe to log.
 *
 * @param url - The URL to extract the host from
 * @returns The host (e.g. "store.example.com") or undefined if absent/unparseable
 */
export const safeHost = (url?: string): string | undefined => {
  if (!url) {
    return undefined
  }

  try {
    return new URL(url).host
  } catch {
    return undefined
  }
}

/**
 * Builds a redacted diagnostics object from a request/upload failure.
 *
 * Accepts an {@link AppError} (the interceptor wraps axios errors and attaches the
 * original as `cause`, so we unwrap one level), a raw `AxiosError`, or any error, and
 * extracts only safe-to-log fields. A truly offline failure and a host-specific
 * transport failure are indistinguishable from the error alone — pair this with a
 * failure-time `NetInfo` snapshot at the call site to tell them apart.
 *
 * @param error - The error thrown by a failed request
 * @returns Redacted diagnostics: axios code, HTTP status, method, and host only
 */
export const getRedactedNetworkDiagnostics = (error: unknown): RedactedNetworkDiagnostics => {
  // The response interceptor converts axios errors into AppErrors, attaching the
  // original axios error as `cause`. Unwrap one level to reach the transport detail.
  const axiosLike = (error instanceof AppError ? error.cause : error) as Partial<AxiosError> | undefined

  if (!axiosLike || typeof axiosLike !== 'object') {
    return {}
  }

  return {
    axiosCode: axiosLike.code,
    httpStatus: axiosLike.response?.status,
    method: axiosLike.config?.method?.toUpperCase(),
    host: safeHost(axiosLike.config?.url),
  }
}

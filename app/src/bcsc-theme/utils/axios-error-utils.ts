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
      data: options.error.config.data,
    }
  }

  if (options.error.response) {
    errorDetails.response = {
      statusText: options.error.response.statusText,
      headers: options.error.response.headers,
      data: options.error.response.data,
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
 * Resolves an AppError based on the AxiosError code, mapping specific Axios error codes to predefined AppError definitions.
 *
 * @param errorCode - The error code from the AxiosError to resolve
 * @returns An AppError if a mapping exists for the error code, or null if no mapping is found
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

  // If we have a predefined error definition for this app event code, use it to create the AppError
  if (errorDefinition) {
    return AppError.fromErrorDefinition(errorDefinition, { cause: error })
  }

  // Create a generic AppError for known event codes that don't have a predefined error definition
  if (isAppEventCode(errorCode)) {
    return new AppError(
      `Server Error: Unregistered error code (${errorCode})`,
      {
        ...ErrorRegistry.UNKNOWN_SERVER_ERROR,
        appEvent: errorCode,
      },
      { cause: error }
    )
  }

  return new AppError(`Server Error: Unknown error code (${errorCode})`, ErrorRegistry.UNKNOWN_SERVER_ERROR, {
    cause: error,
  })
}

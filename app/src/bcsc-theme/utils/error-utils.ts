import { AxiosError } from 'axios'

export const NETWORK_ERROR_CODE = 'NETWORK_ERROR'
export const NETWORK_ERROR_MESSAGE = 'A network error occurred. Please check your internet connection and try again.'

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

/**
 * Formats AxiosErrors from IAS (Identity and Authentication Service) into a standard format.
 *
 * @see bcsc-theme/api/client.ts
 * @param {AxiosError<any>} error - The original AxiosError to format
 * @returns {*} {AxiosError} The formatted AxiosError with updated code and message
 */
export const formatIasAxiosResponseError = (error: AxiosError<any>): AxiosError => {
  // Network error (no response received)
  if (!error.response) {
    error.code = NETWORK_ERROR_CODE
    error.message = NETWORK_ERROR_MESSAGE
    return error
  }

  error.name = 'IASAxiosError'

  // IAS error response
  if (typeof error.response.data?.error === 'string' && typeof error.response.data?.error_description === 'string') {
    error.code = `IAS_${error.response.data.error.toUpperCase()}`
    error.message = error.response.data.error_description
    return error
  }

  // Custom error messages for common HTTP status codes
  if (error.response.status === 503) {
    error.code = 'IAS_SERVICE_UNAVAILABLE'
    error.message = 'The external identity service is currently unavailable.'
  }

  // Add retry information if provided by the server
  if (error.response.status === 503 && error.response.headers?.['retry-after']) {
    const seconds = Number(error.response.headers['retry-after'])
    const minutes = Math.ceil(seconds / 60)
    error.message += ` Please try again after ${minutes} minute${minutes > 1 ? 's' : ''}.`
  }

  return error
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
    isTimeout: options.error.code === 'ECONNABORTED',
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
    return (
      (error as any)?.isNetworkError === true ||
      (error.code === NETWORK_ERROR_CODE && error.message === NETWORK_ERROR_MESSAGE) ||
      (error.code === 'ERR_NETWORK' && error.message === 'Network Error')
    )
  }

  return false
}

/**
 * Determines if the provided error is a 404 Not Found error.
 *
 * @param {unknown} error - The error to check
 * @returns {*} {boolean} True if the error is a 404 error, false otherwise.
 */
export const is404Error = (error: unknown): boolean => {
  return (error as any)?.response?.status === 404
}

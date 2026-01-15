import { ErrorDefinition } from '@/errors'
import { getErrorDefinitionFromAppEvent } from '@/errors/errorHandler'
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

export const getErrorDefinitionFromAxiosError = (axiosError: AxiosError<any>): ErrorDefinition | null => {
  if (
    typeof axiosError.response?.data?.error !== 'string' ||
    typeof axiosError.response?.data?.error_description !== 'string'
  ) {
    return null
  }

  const errorDefinition = getErrorDefinitionFromAppEvent(axiosError.response.data.error)

  if (!errorDefinition) {
    return null
  }

  return errorDefinition
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

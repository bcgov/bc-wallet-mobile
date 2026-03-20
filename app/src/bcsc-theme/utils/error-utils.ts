import { UNKNOWN_APP_ERROR_STATUS_CODE } from '@/constants'
import { AppError, ErrorCategory, ErrorRegistry } from '@/errors'
import { getErrorDefinitionFromAppEventCode } from '@/errors/errorHandler'
import { isAppEventCode } from '@/events/appEventCode'
import { BifoldError } from '@bifold/core'
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
 * Converts an AxiosError into a structured AppError based on the error code and app event mappings.
 *
 * @param error - The AxiosError to convert
 * @returns The resulting AppError with structured information and cause
 */
export const getAppErrorFromAxiosError = (error: AxiosError): AppError => {
  const errorCode = error.code
  const errorDefinition = getErrorDefinitionFromAppEventCode(errorCode)

  // If we have a predefined error definition for this app event code, use it to create the AppError
  if (errorDefinition) {
    return AppError.fromErrorDefinition(errorDefinition, { cause: error })
  }

  // Create a generic AppError for known event codes that don't have a predefined error definition
  if (isAppEventCode(errorCode)) {
    return new AppError(
      `Server Error: Unhandled app event code (${errorCode})`,
      {
        statusCode: UNKNOWN_APP_ERROR_STATUS_CODE,
        appEvent: errorCode,
        category: ErrorCategory.GENERAL,
      },
      { cause: error }
    )
  }

  // For all other cases, return a generic unknown server error
  return AppError.fromErrorDefinition(ErrorRegistry.UNKNOWN_SERVER_ERROR, { cause: error })
}

/**
 * Converts an Error or AppError into a BifoldError, preserving as much information as possible for display in the UI.
 *
 * @param title - The title to display for the error
 * @param description - A user-friendly description of the error
 * @param error - The original error object to convert
 * @returns A BifoldError containing the provided title, description, and details from the original error
 */
export const toBifoldError = (title: string, description: string, error: Error | AppError): BifoldError => {
  let bifoldError: BifoldError

  if (error instanceof AppError) {
    bifoldError = new BifoldError(title, description, error.fullMessage, error.statusCode)
  } else {
    bifoldError = new BifoldError(title, description, error.message, UNKNOWN_APP_ERROR_STATUS_CODE)
  }

  // Attach the cause and stack trace for debugging purposes
  bifoldError.cause = error.cause
  bifoldError.stack = error.stack

  return bifoldError
}

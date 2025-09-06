import { BifoldLogger } from '@bifold/core'

export type VideoCallErrorType =
  | 'connection_failed'
  | 'session_failed'
  | 'call_failed'
  | 'network_error'
  | 'permission_denied'

export interface VideoCallError {
  type: VideoCallErrorType
  message: string
  retryable: boolean
  technicalDetails?: string
}

export const VideoCallErrorHandler = {
  createError: (
    type: VideoCallErrorType,
    message: string,
    retryable = false,
    technicalDetails?: string
  ): VideoCallError => ({
    type,
    message,
    retryable,
    technicalDetails,
  }),

  errors: {
    connectionTimeout: (): VideoCallError => ({
      type: 'connection_failed',
      message: 'Connection to video service timed out.',
      retryable: true,
    }),

    webRTCFailed: (details?: string): VideoCallError => ({
      type: 'connection_failed',
      message: 'Failed to establish video connection.',
      retryable: true,
      technicalDetails: details,
    }),

    sessionCreationFailed: (details?: string): VideoCallError => ({
      type: 'session_failed',
      message: 'Service is unavailable.',
      retryable: false,
      technicalDetails: details,
    }),

    callCreationFailed: (details?: string): VideoCallError => ({
      type: 'call_failed',
      message: 'Failed to initiate video call.',
      retryable: true,
      technicalDetails: details,
    }),

    permissionDenied: (): VideoCallError => ({
      type: 'permission_denied',
      message: 'Camera or microphone access was denied.',
      retryable: false,
    }),

    networkUnavailable: (): VideoCallError => ({
      type: 'network_error',
      message: 'Network connection is unavailable.',
      retryable: true,
    }),

    unknownError: (details?: string): VideoCallError => ({
      type: 'network_error',
      message: 'An unexpected error occurred.',
      retryable: true,
      technicalDetails: details,
    }),
  },

  logError: (error: VideoCallError, logger: BifoldLogger, context?: string): void => {
    const logData = {
      timestamp: new Date().toISOString(),
      context: context || 'unknown',
      errorType: error.type,
      message: error.message,
      retryable: error.retryable,
      technicalDetails: error.technicalDetails,
    }

    logger.error('Video Call Error:', JSON.stringify(logData, null, 2))
  },
}

export default VideoCallErrorHandler

import { VideoCallError, VideoCallErrorType } from '../types/live-call'

export const createVideoCallError = (type: VideoCallErrorType, technicalDetails?: string): VideoCallError => {
  switch (type) {
    case VideoCallErrorType.CONNECTION_TIMEOUT:
      return {
        type,
        message: 'Connection to video service timed out.',
        retryable: true,
        technicalDetails,
      }
    case VideoCallErrorType.CONNECTION_FAILED:
      return {
        type,
        message: 'Failed to establish video connection.',
        retryable: true,
        technicalDetails,
      }
    case VideoCallErrorType.SESSION_FAILED:
      return {
        type,
        message: 'Service is unavailable.',
        retryable: false,
        technicalDetails,
      }
    case VideoCallErrorType.CALL_FAILED:
      return {
        type,
        message: 'Failed to initiate video call.',
        retryable: true,
        technicalDetails,
      }
    case VideoCallErrorType.NETWORK_ERROR:
      return {
        type,
        message: 'Network connection is unavailable.',
        retryable: true,
        technicalDetails,
      }
    case VideoCallErrorType.PERMISSION_DENIED:
      return {
        type,
        message: 'Camera or microphone access was denied.',
        retryable: false,
        technicalDetails,
      }
    default:
      return {
        type: VideoCallErrorType.NETWORK_ERROR,
        message: 'An unexpected error occurred.',
        retryable: true,
        technicalDetails,
      }
  }
}

export default createVideoCallError

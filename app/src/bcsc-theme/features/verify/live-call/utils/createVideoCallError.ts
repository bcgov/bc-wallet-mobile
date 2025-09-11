import { VideoCallError, VideoCallErrorType } from '../types/live-call'

export const createVideoCallError = (type: VideoCallErrorType, technicalDetails?: string): VideoCallError => {
  switch (type) {
    // Pexip / WebRTC failed to connect
    case VideoCallErrorType.CONNECTION_FAILED:
      return {
        type,
        message: 'Failed to establish video connection.',
        retryable: true,
        technicalDetails,
      }
    // API call to create session failed
    case VideoCallErrorType.SESSION_FAILED:
      return {
        type,
        message: 'Service is unavailable.',
        retryable: true,
        technicalDetails,
      }
    // API call to create call failed
    case VideoCallErrorType.CALL_FAILED:
      return {
        type,
        message: 'Failed to initiate video call.',
        retryable: true,
        technicalDetails,
      }
    // User has denied permissions
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

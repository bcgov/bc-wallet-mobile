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
        title: 'Service Unavailable',
        message: 'The video call service is temporarily unavailable. Please try again later.',
        retryable: true,
        technicalDetails,
      }
    // Evidence/photo upload failed
    case VideoCallErrorType.DOCUMENT_UPLOAD_FAILED:
      return {
        type,
        message: 'Failed to upload your documents. Please try again.',
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

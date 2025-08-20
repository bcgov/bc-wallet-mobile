import { Alert } from 'react-native'

export type VideoCallErrorType = 'service_unavailable' | 'connection_failed' | 'session_failed' | 'call_failed' | 'network_error' | 'permission_denied'

export interface VideoCallError {
  type: VideoCallErrorType
  message: string
  retryable: boolean
  technicalDetails?: string
}

export const VideoCallErrorHandler = {
  // Create standardized error objects
  createError: (
    type: VideoCallErrorType, 
    message: string, 
    retryable = true, 
    technicalDetails?: string
  ): VideoCallError => ({
    type,
    message,
    retryable,
    technicalDetails
  }),

  // Handle different error types with appropriate user messaging
  handleError: (error: VideoCallError): void => {
    console.warn(`Video Call Error [${error.type}]:`, error.message, error.technicalDetails)
    
    switch (error.type) {
      case 'service_unavailable':
        // These are handled by navigation to CallBusyOrClosedScreen
        break
      case 'permission_denied':
        Alert.alert(
          'Camera/Microphone Access Required',
          'Please enable camera and microphone permissions in your device settings to use video calling.',
          [{ text: 'OK' }]
        )
        break
      case 'connection_failed':
        if (error.retryable) {
          Alert.alert(
            'Connection Failed',
            `${error.message}\n\nPlease check your internet connection and try again.`,
            [{ text: 'OK' }]
          )
        }
        break
      case 'session_failed':
      case 'call_failed':
        if (error.retryable) {
          Alert.alert(
            'Session Error',
            `${error.message}\n\nThis may be a temporary issue. Please try again.`,
            [{ text: 'OK' }]
          )
        }
        break
      case 'network_error':
        Alert.alert(
          'Network Error',
          'Unable to connect to the video service. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        )
        break
    }
  },

  // Common error scenarios
  errors: {
    serviceUnavailable: (agentCount = 0): VideoCallError => ({
      type: 'service_unavailable',
      message: agentCount === 0 
        ? 'No agents are currently available. Please try again later.' 
        : 'All agents are currently busy. Please try again in a few minutes.',
      retryable: true
    }),

    serviceOutsideHours: (): VideoCallError => ({
      type: 'service_unavailable', 
      message: 'Video calling service is outside of operating hours.',
      retryable: true
    }),

    connectionTimeout: (): VideoCallError => ({
      type: 'connection_failed',
      message: 'Connection to video service timed out.',
      retryable: true
    }),

    webRTCFailed: (details?: string): VideoCallError => ({
      type: 'connection_failed',
      message: 'Failed to establish video connection.',
      retryable: true,
      technicalDetails: details
    }),

    sessionCreationFailed: (details?: string): VideoCallError => ({
      type: 'session_failed',
      message: 'Failed to create video session.',
      retryable: true,
      technicalDetails: details
    }),

    callCreationFailed: (details?: string): VideoCallError => ({
      type: 'call_failed',
      message: 'Failed to initiate video call.',
      retryable: true,
      technicalDetails: details
    }),

    permissionDenied: (): VideoCallError => ({
      type: 'permission_denied',
      message: 'Camera or microphone access was denied.',
      retryable: false
    }),

    networkUnavailable: (): VideoCallError => ({
      type: 'network_error',
      message: 'Network connection is unavailable.',
      retryable: true
    }),

    unknownError: (details?: string): VideoCallError => ({
      type: 'network_error',
      message: 'An unexpected error occurred.',
      retryable: true,
      technicalDetails: details
    })
  },

  // Log errors for debugging
  logError: (error: VideoCallError, context?: string): void => {
    const logData = {
      timestamp: new Date().toISOString(),
      context: context || 'unknown',
      errorType: error.type,
      message: error.message,
      retryable: error.retryable,
      technicalDetails: error.technicalDetails
    }
    
    console.error('Video Call Error Log:', JSON.stringify(logData, null, 2))
    
    // In production, you might want to send this to a logging service
    // logToService(logData)
  }
}

export default VideoCallErrorHandler

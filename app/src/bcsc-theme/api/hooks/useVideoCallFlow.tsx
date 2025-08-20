import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MediaStream } from 'react-native-webrtc'
import { ConnectionRequest } from '../../features/verify/live-call/types/live-call'
import { connect } from '../../features/verify/live-call/utils/connect'
import { VideoCallErrorHandler, VideoCallError as ErrorHandlerError } from '../../features/verify/live-call/utils/errorHandler'
import useVideoCallApi, { VideoCall, VideoDestination, VideoSession } from './useVideoCallApi'

export type VideoCallFlowState =
  | 'idle'
  | 'checking_availability'
  | 'creating_session'
  | 'connecting_webrtc'
  | 'waiting_for_agent'
  | 'in_call'
  | 'call_ended'
  | 'error'

export interface VideoCallError {
  type: 'service_unavailable' | 'connection_failed' | 'session_failed' | 'call_failed' | 'network_error' | 'permission_denied'
  message: string
  retryable: boolean
  technicalDetails?: string
}

export interface VideoCallFlowResult {
  // State
  flowState: VideoCallFlowState
  session: VideoSession | null
  call: VideoCall | null
  error: VideoCallError | null

  // Media streams
  localStream: MediaStream | null
  remoteStream: MediaStream | null

  // Actions
  startVideoCall: () => Promise<void>
  endCall: () => Promise<void>
  retryConnection: () => Promise<void>

  // Loading states
  isConnecting: boolean
  isCreatingSession: boolean
}

const useVideoCallFlow = (): VideoCallFlowResult => {
  const [flowState, setFlowState] = useState<VideoCallFlowState>('idle')
  const [session, setSession] = useState<VideoSession | null>(null)
  const [call, setCall] = useState<VideoCall | null>(null)
  const [error, setError] = useState<VideoCallError | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const navigation = useNavigation<StackNavigationProp<any>>()
  const api = useVideoCallApi()

  // Refs for cleanup
  const sessionRef = useRef<VideoSession | null>(null)
  const callRef = useRef<VideoCall | null>(null)
  const connectionRef = useRef<any>(null)

  // Update refs when state changes
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    callRef.current = call
  }, [call])

  const cleanup = useCallback(async () => {
    try {
      // Clean up WebRTC connection
      if (connectionRef.current) {
        // The current connect implementation doesn't export a disconnect function
        // We'll need to handle cleanup within the connection logic
        connectionRef.current = null
      }

      // End session if active
      if (sessionRef.current && sessionRef.current.status !== 'session_ended') {
        await api.endVideoSession(sessionRef.current.session_id)
      }
    } catch (error) {
      console.warn('Cleanup error:', error)
    }

    setLocalStream(null)
    setRemoteStream(null)
  }, [api])

  const handleError = useCallback((error: VideoCallError) => {
    VideoCallErrorHandler.logError(error, 'useVideoCallFlow')
    setError(error)
    setFlowState('error')
  }, [])

  const checkServiceAvailability = useCallback(async (): Promise<VideoDestination | null> => {
    try {
      const destinations = await api.getVideoDestinations()
      const serviceHours = await api.getServiceHours()

      // Find available destination with agents
      const availableDestination = destinations.find((dest) => dest.numberOfAgents > 0)

      if (!availableDestination) {
        handleError(VideoCallErrorHandler.errors.serviceUnavailable())
        return null
      }

      // TODO: Add service hours validation based on timezone
      // For now, assume service is available if agents are present

      return availableDestination
    } catch (error) {
      handleError(VideoCallErrorHandler.errors.networkUnavailable())
      return null
    }
  }, [api, handleError])

  const createSession = useCallback(async (): Promise<VideoSession | null> => {
    try {
      const newSession = await api.createVideoSession()
      setSession(newSession)
      return newSession
    } catch (error) {
      handleError(VideoCallErrorHandler.errors.sessionCreationFailed(error?.toString()))
      return null
    }
  }, [api, handleError])

  const establishWebRTCConnection = useCallback(
    async (session: VideoSession): Promise<boolean> => {
      try {
        // Parse the gateway URI to extract connection details
        const gatewayUrl = new URL(session.gateway_uri)

        const connectionRequest: ConnectionRequest & { onRemoteStream: (mediaStream: MediaStream) => void } = {
          nodeUrl: gatewayUrl.origin,
          conferenceAlias: session.destination,
          displayName: 'Verification Client',
          pin: session.session_token, // Using session token as PIN for Pexip
          onRemoteStream: (stream: MediaStream) => {
            setRemoteStream(stream)
            setFlowState('in_call')
          },
        }

        const result = await connect(connectionRequest)
        connectionRef.current = result

        setFlowState('waiting_for_agent')
        return true
      } catch (error) {
        handleError(VideoCallErrorHandler.errors.webRTCFailed(error?.toString()))
        return false
      }
    },
    [handleError]
  )

  const createCall = useCallback(
    async (sessionId: string): Promise<VideoCall | null> => {
      try {
        const newCall = await api.createVideoCall(sessionId)
        setCall(newCall)

        // Update call status to indicate we're ready
        await api.updateVideoCallStatus(sessionId, newCall.call_id, 'call_media_pending')

        return newCall
      } catch (error) {
        handleError(VideoCallErrorHandler.errors.callCreationFailed(error?.toString()))
        return null
      }
    },
    [api, handleError]
  )

  const startVideoCall = useCallback(async () => {
    setError(null)

    try {
      // Step 1: Check service availability
      setFlowState('checking_availability')
      const destination = await checkServiceAvailability()
      if (!destination) return

      // Step 2: Create session
      setFlowState('creating_session')
      const newSession = await createSession()
      if (!newSession) return

      // Step 3: Establish WebRTC connection
      setFlowState('connecting_webrtc')
      const connected = await establishWebRTCConnection(newSession)
      if (!connected) return

      // Step 4: Create call
      const newCall = await createCall(newSession.session_id)
      if (!newCall) return

      // Success - now waiting for agent
      setFlowState('waiting_for_agent')
    } catch (error) {
      handleError(VideoCallErrorHandler.errors.unknownError(error?.toString()))
    }
  }, [checkServiceAvailability, createSession, establishWebRTCConnection, createCall, handleError])

  const endCall = useCallback(async () => {
    try {
      if (call && session) {
        // Update call status to ended
        await api.updateVideoCallStatus(session.session_id, call.call_id, 'call_ended')

        // Update session status
        await api.updateVideoSessionStatus(session.session_id, 'session_ended')
      }

      await cleanup()

      setFlowState('call_ended')
      setSession(null)
      setCall(null)

      // Navigate back to verification options or previous screen
      navigation.goBack()
    } catch (error) {
      console.warn('Error ending call:', error)
      // Still perform cleanup even if API calls fail
      await cleanup()
      setFlowState('call_ended')
      navigation.goBack()
    }
  }, [api, call, session, cleanup, navigation])

  const retryConnection = useCallback(async () => {
    await cleanup()
    setError(null)
    setSession(null)
    setCall(null)
    await startVideoCall()
  }, [cleanup, startVideoCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // Handle call status updates (polling or push notifications would be better)
  useEffect(() => {
    if (call && flowState === 'waiting_for_agent') {
      const pollInterval = setInterval(async () => {
        try {
          // In a real implementation, this would be handled by WebSocket or push notifications
          // For now, we'll assume the call status is updated through the WebRTC connection events

          // When agent joins, the WebRTC connection will trigger onRemoteStream
          if (remoteStream) {
            setFlowState('in_call')
            clearInterval(pollInterval)
          }
        } catch (error) {
          console.warn('Error polling call status:', error)
        }
      }, 2000)

      return () => clearInterval(pollInterval)
    }
  }, [call, flowState, remoteStream])

  return {
    flowState,
    session,
    call,
    error,
    localStream,
    remoteStream,
    startVideoCall,
    endCall,
    retryConnection,
    isConnecting: flowState === 'connecting_webrtc',
    isCreatingSession: flowState === 'creating_session' || flowState === 'checking_availability',
  }
}

export default useVideoCallFlow

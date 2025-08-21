import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
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
  const [clientCallId, setClientCallId] = useState<string | null>(null)

  const navigation = useNavigation<StackNavigationProp<any>>()
  const api = useVideoCallApi()

  // Generate client call ID when component mounts (like iOS)
  useEffect(() => {
    if (!clientCallId) {
      const generatedCallId = generateUUID()
      setClientCallId(generatedCallId)
      console.log('Generated client call ID:', generatedCallId)
    }
  }, [])

  // Helper function to generate UUID (like iOS UUID().uuidString)
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Refs for cleanup
  const sessionRef = useRef<VideoSession | null>(null)
  const callRef = useRef<VideoCall | null>(null)
  const connectionRef = useRef<any>(null)
  const clientCallIdRef = useRef<string | null>(null)

  // Update refs when state changes
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    callRef.current = call
  }, [call])

  useEffect(() => {
    clientCallIdRef.current = clientCallId
  }, [clientCallId])

  // Immediate media termination (synchronous, no API calls)
  const stopAllMedia = useCallback(() => {
    console.log('EMERGENCY STOP: Terminating all media immediately...')
    
    try {
      // Stop local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop()
          console.log(`STOPPED ${track.kind} track:`, track.id)
        })
      }

      // Stop remote stream tracks  
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => {
          track.stop()
          console.log(`STOPPED remote ${track.kind} track:`, track.id)
        })
      }

      // Close peer connection immediately
      if (connectionRef.current) {
        connectionRef.current.close()
        connectionRef.current = null
        console.log('CLOSED peer connection')
      }

      // Clear stream state immediately
      setLocalStream(null)
      setRemoteStream(null)
    } catch (error) {
      console.error('Error in emergency media stop:', error)
    }
  }, [localStream, remoteStream])

  const cleanup = useCallback(async () => {
    // First, immediately stop all media (no delays, no async)
    stopAllMedia()

    try {
      // Then handle API cleanup (but don't let this delay media termination)
      if (sessionRef.current && sessionRef.current.status !== 'session_ended') {
        try {
          await api.endVideoSession(sessionRef.current.session_id)
        } catch (error) {
          console.warn('Error ending session (media already stopped):', error)
        }
      }
    } catch (error) {
      console.warn('Cleanup error:', error)
    } finally {
      // Final state cleanup
      setClientCallId(null)
    }
  }, [api, stopAllMedia])

  const handleError = useCallback((error: VideoCallError) => {
    VideoCallErrorHandler.logError(error, 'useVideoCallFlow')
    setError(error)
    setFlowState('error')
    
    // Immediately stop all media on any error to protect user privacy
    console.log('Error occurred - performing IMMEDIATE media stop...')
    stopAllMedia()
  }, [stopAllMedia])

  const checkServiceAvailability = useCallback(async (): Promise<VideoDestination | null> => {
    try {
      const destinations = await api.getVideoDestinations()
      const serviceHours = await api.getServiceHours()

      // Find available destination with agents
      const availableDestination = destinations.find((dest) => dest.destination_name === 'Test Harness Queue Destination')

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
        console.log('Parsing gateway URI...', session)

        const gatewayUrl = `https://${session.destination_host}`
        console.log('Gateway URL:', gatewayUrl)

        const connectionRequest: ConnectionRequest & { onRemoteStream: (mediaStream: MediaStream) => void } = {
          nodeUrl: gatewayUrl,
          conferenceAlias: session.room_alias,
          displayName: session.room_name,
          pin: session.guest_pin,
          onRemoteStream: (stream: MediaStream) => {
            setRemoteStream(stream)
            setFlowState('in_call')
          },
        }

        console.log('Connection Request:', connectionRequest)

        const result = await connect(connectionRequest)
        console.log('Connect result:', result)
        
        // Store the connection info (but keep our pre-generated clientCallId)
        connectionRef.current = result.peerConnection
        setLocalStream(result.localStream)
        
        console.log('Using pre-generated client call ID:', clientCallIdRef.current)
        console.log('WebRTC call UUID (for reference):', result.callUuid)

        setFlowState('waiting_for_agent')
        return true
      } catch (error) {
        console.log((error as Error).message, (error as Error).name, (error as Error).cause)
        handleError(VideoCallErrorHandler.errors.webRTCFailed(error?.toString()))
        return false
      }
    },
    [handleError]
  )

  const createCall = useCallback(
    async (sessionId: string): Promise<VideoCall | null> => {
      try {
        console.log('Creating call with client_call_id:', clientCallIdRef.current)
        const newCall = await api.createVideoCall(sessionId, clientCallIdRef.current || undefined)
        setCall(newCall)

        // TODO: Determine if immediate status update is necessary
        // The iOS implementation doesn't immediately update call status after creation
        // await api.updateVideoCallStatus(sessionId, newCall.call_id, 'call_media_pending', clientCallIdRef.current || undefined)

        return newCall
      } catch (error) {
        console.error('Error creating call:', error)
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
      console.log('flowState', flowState)
      handleError(VideoCallErrorHandler.errors.unknownError(error?.toString()))
    }
  }, [checkServiceAvailability, createSession, establishWebRTCConnection, createCall, handleError])

  const endCall = useCallback(async () => {
    console.log('End call button pressed - IMMEDIATELY stopping all media...')
    
    // CRITICAL: Stop all media IMMEDIATELY and synchronously
    // This ensures user privacy and stops audio/video right away
    stopAllMedia()

    try {
      if (call && session) {
        // Update call status to ended (but don't block navigation if this fails)
        await api.updateVideoCallStatus(session.session_id, call.call_id, 'call_ended', clientCallIdRef.current || undefined)

        // Update session status  
        await api.updateVideoSessionStatus(session.session_id, 'session_ended')
      }
    } catch (error) {
      console.warn('Error updating call/session status (media already stopped):', error)
    }

    // Complete any remaining cleanup
    await cleanup()

    // Clear state and navigate
    setFlowState('call_ended')
    setSession(null)
    setCall(null)

    // Navigate back to verification options or previous screen
    navigation.goBack()
  }, [stopAllMedia, cleanup, api, call, session, navigation])

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

  // Cleanup when navigating away from the screen
  useFocusEffect(
    useCallback(() => {
      // When the screen comes into focus, do nothing special
      return () => {
        // When the screen loses focus (user navigates away), stop media immediately
        console.log('Screen lost focus - IMMEDIATELY stopping all media...')
        stopAllMedia()
      }
    }, [stopAllMedia])
  )

  // Cleanup when app goes to background (critical for user privacy)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('App going to background - IMMEDIATELY stopping all media for privacy...')
        stopAllMedia()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription?.remove()
  }, [stopAllMedia])

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

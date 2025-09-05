import useApi from '@bcsc-theme/api/hooks/useApi'
import { VideoCall, VideoSession } from '@bcsc-theme/api/hooks/useVideoCallApi'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import uuid from 'react-native-uuid'
import { MediaStream } from 'react-native-webrtc'
import { ConnectionRequest } from '../types/live-call'
import { connect, ConnectResult } from '../utils/connect'
import { VideoCallErrorHandler } from '../utils/errorHandler'

export type VideoCallFlowState =
  | 'idle'
  | 'creating_session'
  | 'connecting_webrtc'
  | 'waiting_for_agent'
  | 'in_call'
  | 'call_ended'
  | 'error'

export interface VideoCallError {
  type: 'connection_failed' | 'session_failed' | 'call_failed' | 'network_error' | 'permission_denied'
  message: string
  retryable: boolean
  technicalDetails?: string
}

export interface VideoCallFlowResult {
  flowState: VideoCallFlowState
  error: VideoCallError | null
  isInBackground: boolean

  localStream: MediaStream | null
  remoteStream: MediaStream | null

  startVideoCall: () => Promise<void>
  cleanup: () => Promise<void>
  retryConnection: () => Promise<void>
}

const useVideoCallFlow = (leaveCall: () => Promise<void>): VideoCallFlowResult => {
  const [flowState, setFlowState] = useState<VideoCallFlowState>('idle')
  const [session, setSession] = useState<VideoSession | null>(null)
  const [clientCallId, setClientCallId] = useState<string | null>(null)
  const [error, setError] = useState<VideoCallError | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isInBackground, setIsInBackground] = useState(false)
  const [connection, setConnection] = useState<ConnectResult | null>(null)
  const backendKeepAliveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevIsInBackgroundRef = useRef(false)
  const cleanupInProgressRef = useRef(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { video } = useApi()

  const backgroundMode: 'full_cleanup' | 'audio_only' | 'disabled' = useMemo(() => {
    if (!isInBackground) return 'disabled'

    if (
      flowState === 'waiting_for_agent' ||
      flowState === 'in_call' ||
      flowState === 'connecting_webrtc' ||
      flowState === 'creating_session'
    ) {
      return 'audio_only'
    }

    return 'full_cleanup'
  }, [flowState, isInBackground])

  const stopAllMedia = useCallback(() => {
    if (localStream) {
      logger.info('Stopping local stream tracks...')
      localStream.getTracks().forEach((track) => track.stop())
    }

    if (remoteStream) {
      logger.info('Stopping remote stream tracks...')
      remoteStream.getTracks().forEach((track) => track.stop())
    }

    logger.info('Media stopped successfully')
  }, [localStream, remoteStream, logger])

  const cleanup = useCallback(async () => {
    if (cleanupInProgressRef.current) {
      logger.info('Cleanup already in progress, skipping...')
      return
    }

    cleanupInProgressRef.current = true
    stopAllMedia()
    connection?.stopPexipKeepAlive()
    connection?.setAppInitiatedDisconnect(true)

    if (backendKeepAliveTimerRef.current) {
      clearInterval(backendKeepAliveTimerRef.current)
      backendKeepAliveTimerRef.current = null
    }

    try {
      logger.info('Disconnecting from Pexip...')
      await connection?.disconnectPexip()
    } catch (error) {
      logger.warn('Error disconnecting from Pexip:', error)
    }

    try {
      if (!session || !clientCallId) {
        throw new Error('Missing required parameters to end call')
      }

      await video.updateVideoCallStatus(session.session_id, clientCallId, 'call_ended')
    } catch (error) {
      logger.warn(error)
    }

    try {
      if (!session) {
        throw new Error('Missing required parameters to end session')
      }

      await video.endVideoSession(session.session_id)
    } catch (error) {
      logger.warn(error)
    }

    setSession(null)
    setClientCallId(null)
    setConnection(null)
    setError(null)
  }, [video, stopAllMedia, clientCallId, session, connection, logger])

  const startBackendKeepAlive = useCallback(() => {
    if (backendKeepAliveTimerRef.current) {
      clearInterval(backendKeepAliveTimerRef.current)
    }

    const timer = setInterval(async () => {
      try {
        if (session && clientCallId) {
          await video.updateVideoCallStatus(session.session_id, clientCallId, 'call_in_call')
        } else {
          throw new Error('Missing session or call ID for keep-alive update')
        }
      } catch (error) {
        logger.warn('Backend keep-alive update failed:', error)
      }
    }, 30000)

    backendKeepAliveTimerRef.current = timer
  }, [session, clientCallId, video, logger])

  const handleRemoteDisconnect = useCallback(async () => {
    try {
      await cleanup()
      await leaveCall()
    } catch (error) {
      logger.warn('Error during remote disconnect:', error)
    }
  }, [cleanup, leaveCall, logger])

  const handleError = useCallback(
    (error: VideoCallError) => {
      VideoCallErrorHandler.logError(error, logger, 'useVideoCallFlow')
      setError(error)
      setFlowState('error')

      stopAllMedia()
      setSession(null)
      setClientCallId(null)
      setConnection(null)
    },
    [stopAllMedia, logger]
  )

  const createSession = useCallback(async (): Promise<VideoSession | null> => {
    try {
      const newSession = await video.createVideoSession()
      setSession(newSession)
      return newSession
    } catch (error) {
      handleError(VideoCallErrorHandler.errors.sessionCreationFailed(error?.toString()))
      return null
    }
  }, [video, handleError])

  const establishWebRTCConnection = useCallback(
    async (session: VideoSession): Promise<boolean> => {
      try {
        const gatewayUrl = `https://${session.destination_host}`

        const connectionRequest: ConnectionRequest & {
          onRemoteStream: (mediaStream: MediaStream) => void
          onRemoteDisconnect: () => void
        } = {
          nodeUrl: gatewayUrl,
          conferenceAlias: session.room_alias,
          displayName: session.room_name,
          pin: session.guest_pin,
          onRemoteStream: (stream: MediaStream) => {
            setRemoteStream(stream)
            setFlowState('in_call')
          },
          onRemoteDisconnect: handleRemoteDisconnect,
        }

        const result = await connect(connectionRequest, logger)
        result.setAppInitiatedDisconnect(false)
        setConnection(result)
        setLocalStream(result.localStream)

        setFlowState('waiting_for_agent')
        return true
      } catch (error) {
        handleError(VideoCallErrorHandler.errors.webRTCFailed(error?.toString()))
        return false
      }
    },
    [handleError, handleRemoteDisconnect, logger]
  )

  const createCall = useCallback(
    async (sessionId: string): Promise<VideoCall | null> => {
      try {
        const id = uuid.v4().toString()
        setClientCallId(id)
        const call = await video.createVideoCall(sessionId, id, 'call_ringing')
        return call
      } catch (error) {
        handleError(VideoCallErrorHandler.errors.callCreationFailed(error?.toString()))
        return null
      }
    },
    [video, handleError]
  )

  const startVideoCall = useCallback(async () => {
    try {
      cleanupInProgressRef.current = false

      setFlowState('creating_session')
      const newSession = await createSession()
      if (!newSession) return

      setFlowState('connecting_webrtc')
      const connected = await establishWebRTCConnection(newSession)
      if (!connected) return

      const call = await createCall(newSession.session_id)
      if (!call) return
    } catch (error) {
      handleError(VideoCallErrorHandler.errors.unknownError(error?.toString()))
    }
  }, [createSession, establishWebRTCConnection, createCall, handleError])

  const retryConnection = useCallback(async () => {
    await cleanup()
    await startVideoCall()
  }, [cleanup, startVideoCall])

  // ref because we only want the cleanup in the following effect to be triggered on full unmount
  const cleanupRef = useRef(cleanup)
  cleanupRef.current = cleanup
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'background') {
        setIsInBackground(true)
      } else if (nextAppState === 'active') {
        setIsInBackground(false)
      }
    })

    return () => {
      subscription.remove()
      cleanupRef.current()
    }
  }, [])

  useEffect(() => {
    if (!prevIsInBackgroundRef.current && isInBackground) {
      logger.info('Background transition...')

      if (backgroundMode === 'full_cleanup') {
        cleanup()
          .then(() => {
            leaveCall()
          })
          .catch((error) => {
            logger.error('Error during full cleanup background transition:', error)
          })
      }

      if (backgroundMode === 'audio_only' && localStream) {
        logger.info('Stopping video but keeping audio connection...')

        const videoTracks = localStream.getVideoTracks()
        videoTracks.forEach((track) => {
          track.enabled = false
        })
      }

      prevIsInBackgroundRef.current = isInBackground
    }

    if (prevIsInBackgroundRef.current && !isInBackground) {
      logger.info('Foreground transition...')

      if (backgroundMode === 'disabled' && localStream) {
        const videoTracks = localStream.getVideoTracks()
        videoTracks.forEach((track) => {
          track.enabled = true
        })
      }

      prevIsInBackgroundRef.current = isInBackground
    }
  }, [isInBackground, backgroundMode, localStream, cleanup, leaveCall, logger])

  useEffect(() => {
    if (flowState === 'in_call' && session && clientCallId) {
      logger.info('Starting backend keep-alive timer...')
      startBackendKeepAlive()
    }
  }, [flowState, session, clientCallId, startBackendKeepAlive, logger])

  return {
    flowState,
    error,
    localStream,
    remoteStream,
    isInBackground,
    startVideoCall,
    cleanup,
    retryConnection,
  }
}

export default useVideoCallFlow

import useApi from '@bcsc-theme/api/hooks/useApi'
import { VideoCall, VideoSession } from '@bcsc-theme/api/hooks/useVideoCallApi'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import uuid from 'react-native-uuid'
import { MediaStream } from 'react-native-webrtc'
import { keepAliveIntervalMs } from '../constants'
import {
  ConnectionRequest,
  ConnectResult,
  VideoCallBackgroundMode,
  VideoCallError,
  VideoCallErrorType,
  VideoCallFlowState,
} from '../types/live-call'
import { connect } from '../utils/connect'
import createVideoCallError from '../utils/createVideoCallError'

export interface VideoCallFlow {
  flowState: VideoCallFlowState
  videoCallError: VideoCallError | null
  isInBackground: boolean

  localStream: MediaStream | null
  remoteStream: MediaStream | null

  startVideoCall: () => Promise<void>
  cleanup: () => Promise<void>
  retryConnection: () => Promise<void>
  setCallEnded: () => void
}

const useVideoCallFlow = (leaveCall: () => Promise<void>): VideoCallFlow => {
  const [flowState, setFlowState] = useState<VideoCallFlowState>(VideoCallFlowState.IDLE)
  const [session, setSession] = useState<VideoSession | null>(null)
  const [clientCallId, setClientCallId] = useState<string | null>(null)
  const [videoCallError, setVideoCallError] = useState<VideoCallError | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isInBackground, setIsInBackground] = useState(false)
  const [connection, setConnection] = useState<ConnectResult | null>(null)
  const backendKeepAliveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevIsInBackgroundRef = useRef(false)
  const cleanupInProgressRef = useRef(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { video } = useApi()

  // This value is watched to determine which background-related action to take
  const backgroundMode: VideoCallBackgroundMode = useMemo(() => {
    if (!isInBackground) return VideoCallBackgroundMode.DISABLED

    if (
      flowState === VideoCallFlowState.WAITING_FOR_AGENT ||
      flowState === VideoCallFlowState.IN_CALL ||
      flowState === VideoCallFlowState.CONNECTING_WEBRTC ||
      flowState === VideoCallFlowState.CREATING_SESSION
    ) {
      return VideoCallBackgroundMode.AUDIO_ONLY
    }

    return VideoCallBackgroundMode.FULL_CLEANUP
  }, [flowState, isInBackground])

  // Sets to final flow state which allows UI to update accordingly
  const setCallEnded = useCallback(() => {
    setFlowState(VideoCallFlowState.CALL_ENDED)
  }, [])

  // Immediately stops all video and audio
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

  // TODO: comment this function
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
      // Just warn as pexip call may already be disconnected from remote side and throw because of that
      logger.warn('Error disconnecting from Pexip:', { error })
    }

    try {
      if (!session || !clientCallId) {
        throw new Error('Missing required parameters to end call')
      }

      await video.updateVideoCallStatus(session.session_id, clientCallId, 'call_ended')
    } catch (error) {
      logger.error('Failed to update video call status:', error as Error)
    }

    try {
      if (!session) {
        throw new Error('Missing required parameters to end session')
      }

      await video.endVideoSession(session.session_id)
    } catch (error) {
      logger.error('Failed to end video session:', error as Error)
    }

    setSession(null)
    setClientCallId(null)
    setConnection(null)
    setVideoCallError(null)
    cleanupInProgressRef.current = false
  }, [video, stopAllMedia, clientCallId, session, connection, logger])

  // TODO: comment
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
      } catch {
        // Just warn as one missed keep alive won't impact the call
        logger.warn('Backend keep-alive update failed')
      }
    }, keepAliveIntervalMs)

    backendKeepAliveTimerRef.current = timer
  }, [session, clientCallId, video, logger])

  // TODO: comment
  const handleRemoteDisconnect = useCallback(async () => {
    try {
      await cleanup()
      setCallEnded()
      await leaveCall()
    } catch (error) {
      logger.warn(`Error during remote disconnect: ${error}`)
    }
  }, [cleanup, leaveCall, logger])

  // TODO: comment
  const handleError = useCallback(
    (type: VideoCallErrorType, error: Error) => {
      logger.error(`Video call error [${type}]:`, error)
      const videoCallError = createVideoCallError(type, error?.toString())
      setVideoCallError(videoCallError)
      setFlowState(VideoCallFlowState.ERROR)

      stopAllMedia()
      setSession(null)
      setClientCallId(null)
      setConnection(null)
    },
    [stopAllMedia, logger]
  )

  // TODO: comment this function
  const createSession = useCallback(async (): Promise<VideoSession | null> => {
    try {
      const newSession = await video.createVideoSession()
      setSession(newSession)
      return newSession
    } catch (error) {
      handleError(VideoCallErrorType.SESSION_FAILED, error as Error)
      return null
    }
  }, [video, handleError])

  // TODO: comment this function
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
            setFlowState(VideoCallFlowState.IN_CALL)
          },
          onRemoteDisconnect: handleRemoteDisconnect,
        }

        const conn = await connect(connectionRequest, logger)
        conn.setAppInitiatedDisconnect(false)
        setConnection(conn)
        setLocalStream(conn.localStream)

        setFlowState(VideoCallFlowState.WAITING_FOR_AGENT)
        return true
      } catch (error) {
        handleError(VideoCallErrorType.CONNECTION_FAILED, error as Error)
        return false
      }
    },
    [handleError, handleRemoteDisconnect, logger]
  )

  // TODO: comment this function
  const createCall = useCallback(
    async (sessionId: string): Promise<VideoCall | null> => {
      try {
        const id = uuid.v4().toString()
        setClientCallId(id)
        const call = await video.createVideoCall(sessionId, id, 'call_ringing')
        return call
      } catch (error) {
        handleError(VideoCallErrorType.CALL_FAILED, error as Error)
        return null
      }
    },
    [video, handleError]
  )

  // TODO: comment this function
  // all of the functions within catch their own errors
  const startVideoCall = useCallback(async () => {
    setFlowState(VideoCallFlowState.CREATING_SESSION)
    const newSession = await createSession()
    if (!newSession) return

    setFlowState(VideoCallFlowState.CONNECTING_WEBRTC)
    const connected = await establishWebRTCConnection(newSession)
    if (!connected) return

    const newCall = await createCall(newSession.session_id)
    if (!newCall) return
  }, [createSession, establishWebRTCConnection, createCall])

  // TODO: comment this function
  // both functions within catch their own errors
  const retryConnection = useCallback(async () => {
    await cleanup()
    await startVideoCall()
  }, [cleanup, startVideoCall])

  // TODO: comment
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

  // TODO: comment
  useEffect(() => {
    if (!prevIsInBackgroundRef.current && isInBackground) {
      logger.info('Background transition...')

      if (backgroundMode === VideoCallBackgroundMode.FULL_CLEANUP) {
        cleanup()
          .then(() => {
            setCallEnded()
            leaveCall()
          })
          .catch((error) => {
            logger.error('Error during full cleanup background transition:', error)
          })
      }

      if (backgroundMode === VideoCallBackgroundMode.AUDIO_ONLY && localStream) {
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
      if (backgroundMode === VideoCallBackgroundMode.DISABLED && localStream) {
        const videoTracks = localStream.getVideoTracks()
        videoTracks.forEach((track) => {
          track.enabled = true
        })
      }

      prevIsInBackgroundRef.current = isInBackground
    }
  }, [isInBackground, backgroundMode, localStream, cleanup, leaveCall, logger])

  // TODO: comment this function
  useEffect(() => {
    if (flowState === VideoCallFlowState.IN_CALL && session && clientCallId) {
      logger.info('Starting backend keep-alive timer...')
      startBackendKeepAlive()
    }
  }, [flowState, session, clientCallId, startBackendKeepAlive, logger])

  return {
    flowState,
    videoCallError,
    localStream,
    remoteStream,
    isInBackground,
    startVideoCall,
    cleanup,
    retryConnection,
    setCallEnded,
  }
}

export default useVideoCallFlow

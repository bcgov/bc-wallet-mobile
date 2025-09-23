import useApi from '@bcsc-theme/api/hooks/useApi'
import { VideoCall, VideoSession } from '@bcsc-theme/api/hooks/useVideoCallApi'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import uuid from 'react-native-uuid'
import { MediaStream } from 'react-native-webrtc'

import { keepAliveIntervalMs } from '@/constants'
import {
  ConnectionRequest,
  ConnectResult,
  VideoCallBackgroundMode,
  VideoCallError,
  VideoCallErrorType,
  VideoCallFlowState,
} from '../types/live-call'
import { clearIntervalIfExists } from '../utils/clearTimeoutIfExists'
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
  const cleanupCompletedRef = useRef(false)
  const handleRemoteDisconnectRef = useRef<(() => Promise<void>) | null>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { video } = useApi()

  // this value is watched to determine which background-related action to take
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

  // sets to final flow state which allows UI to update accordingly
  const setCallEnded = useCallback(() => {
    setFlowState(VideoCallFlowState.CALL_ENDED)
  }, [])

  // immediately stops all video and audio
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

  // stops media
  // stops keep-alives
  // disconnects from pexip conference
  // updates call and session via API
  // clears state
  const cleanup = useCallback(async () => {
    if (cleanupCompletedRef.current) {
      logger.info('Cleanup already completed, skipping...')
      return
    }
    cleanupCompletedRef.current = true
    stopAllMedia()
    connection?.setAppInitiatedDisconnect(true)
    connection?.stopPexipKeepAlive()
    clearIntervalIfExists(backendKeepAliveTimerRef)

    try {
      logger.info('Disconnecting from Pexip...')
      await connection?.disconnectPexip()
    } catch (error) {
      logger.error('Error disconnecting from Pexip:', error as Error)
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
  }, [video, stopAllMedia, clientCallId, session, connection, logger])

  const startBackendKeepAlive = useCallback(() => {
    clearIntervalIfExists(backendKeepAliveTimerRef)

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

  // when the call is disconnected by the agent or due to network issues
  const handleRemoteDisconnect = useCallback(async () => {
    try {
      setCallEnded()
      await cleanup()
      await leaveCall()
    } catch (error) {
      logger.warn(`Error during remote disconnect: ${error}`)
    }
  }, [setCallEnded, cleanup, leaveCall, logger])
  // The above memoized callback is needed in the connection request but
  // we still want it to use up-to-date values, so we're storing it in a ref
  // to prevent stale closures
  handleRemoteDisconnectRef.current = handleRemoteDisconnect

  // creates a more elaborate error object with additional options that
  // the UI can make use of
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

  // 1. a session must be created before anything else
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

  // 2. with the session and the gateway URL, we can initiate the WebRTC connection
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
          onRemoteDisconnect: () => handleRemoteDisconnectRef.current?.(),
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
    [handleError, logger]
  )

  // 3. this API call is really just for the benefit of the backend to track the call
  // status and make appropriate updates
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

  // three step process with the steps above
  // all of the functions within catch their own errors
  const startVideoCall = useCallback(async () => {
    cleanupCompletedRef.current = false
    setFlowState(VideoCallFlowState.CREATING_SESSION)
    const newSession = await createSession()
    if (!newSession) return

    setFlowState(VideoCallFlowState.CONNECTING_WEBRTC)
    const connected = await establishWebRTCConnection(newSession)
    if (!connected) return

    const newCall = await createCall(newSession.session_id)
    if (!newCall) return
  }, [createSession, establishWebRTCConnection, createCall])

  // if the user encounters a retryable error, they can start the process again
  const retryConnection = useCallback(async () => {
    await cleanup()
    await startVideoCall()
  }, [cleanup, startVideoCall])

  // ref because we only want the cleanup in the following effect to be triggered on full unmount
  const cleanupRef = useRef(cleanup)
  cleanupRef.current = cleanup
  useEffect(() => {
    return () => {
      cleanupRef.current()
    }
  }, [])

  // create listener for background state
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
    }
  }, [])

  // this effect handles transitions to and from background
  // the combo of ref and state is to prevent extra calls to cleanup or
  // re-enabling video tracks when the app state changes but the background
  // state does not
  useEffect(() => {
    if (!prevIsInBackgroundRef.current && isInBackground) {
      logger.info('Background transition...')

      if (backgroundMode === VideoCallBackgroundMode.FULL_CLEANUP) {
        logger.info('Performing full cleanup due to background transition...')
        setCallEnded()
        cleanup()
          .then(() => {
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
  }, [isInBackground, backgroundMode, localStream, setCallEnded, cleanup, leaveCall, logger])

  // start the API keep alive when the call is ready
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

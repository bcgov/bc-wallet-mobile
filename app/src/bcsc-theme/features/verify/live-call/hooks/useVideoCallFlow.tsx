import { KEEP_ALIVE_INTERVAL_MS } from '@/constants'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import useApi from '@bcsc-theme/api/hooks/useApi'
import { VideoCall, VideoSession } from '@bcsc-theme/api/hooks/useVideoCallApi'
import useEvidenceUpload from '@bcsc-theme/hooks/useEvidenceUpload'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState } from 'react-native'
import uuid from 'react-native-uuid'
import { MediaStream } from 'react-native-webrtc'
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

// Maps v4 error types to v3-compatible Snowplow error codes
// so analytics are consistent across both platforms
const AnalyticsErrorCodeMap: Record<VideoCallErrorType, string> = {
  [VideoCallErrorType.DOCUMENT_UPLOAD_FAILED]: 'file_upload_error',
  [VideoCallErrorType.SESSION_FAILED]: 'server_error',
  [VideoCallErrorType.CONNECTION_FAILED]: 'problem_with_connection',
  [VideoCallErrorType.CALL_FAILED]: 'problem_with_connection',
  [VideoCallErrorType.NETWORK_ERROR]: 'no_internet',
  [VideoCallErrorType.PERMISSION_DENIED]: 'permission_denied',
}

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
  const backendKeepAliveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevIsInBackgroundRef = useRef(false)
  const handleRemoteDisconnectRef = useRef<(() => Promise<void>) | null>(null)
  const abortedRef = useRef(false)
  const connectionRef = useRef<ConnectResult | null>(null)
  const sessionRef = useRef<VideoSession | null>(null)
  const clientCallIdRef = useRef<string | null>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { video } = useApi()
  const { uploadSelfiePhoto, processAdditionalEvidence, uploadEvidenceBinaries } = useEvidenceUpload()
  const { t } = useTranslation()

  // this value is watched to determine which background-related action to take
  const backgroundMode: VideoCallBackgroundMode = useMemo(() => {
    if (!isInBackground) {
      return VideoCallBackgroundMode.DISABLED
    }

    if (
      flowState === VideoCallFlowState.WAITING_FOR_AGENT ||
      flowState === VideoCallFlowState.IN_CALL ||
      flowState === VideoCallFlowState.CONNECTING_WEBRTC ||
      flowState === VideoCallFlowState.CREATING_SESSION ||
      flowState === VideoCallFlowState.UPLOADING_DOCUMENTS
    ) {
      return VideoCallBackgroundMode.AUDIO_ONLY
    }

    return VideoCallBackgroundMode.FULL_CLEANUP
  }, [flowState, isInBackground])

  // sets to final flow state which allows UI to update accordingly
  const setCallEnded = useCallback(() => {
    setFlowState(VideoCallFlowState.CALL_ENDED)
  }, [])

  // stops keep-alives
  // disconnects from pexip conference
  // updates call and session via API
  // clears state
  //
  // This function is idempotent: refs are captured and cleared synchronously
  // at the top so concurrent or repeated calls are safe no-ops.
  const cleanup = useCallback(async () => {
    abortedRef.current = true

    // Capture and clear refs synchronously to prevent concurrent cleanup
    // calls from double-releasing resources
    const conn = connectionRef.current
    connectionRef.current = null
    const sid = sessionRef.current?.session_id ?? null
    sessionRef.current = null
    const cid = clientCallIdRef.current
    clientCallIdRef.current = null

    conn?.setAppInitiatedDisconnect(true)
    conn?.stopPexipKeepAlive()
    conn?.closePexipEventSource()
    clearIntervalIfExists(backendKeepAliveTimerRef)

    if (conn) {
      try {
        logger.info('Disconnecting from Pexip...')
        await conn.disconnectPexip()
      } catch (error) {
        logger.error('Error disconnecting from Pexip:', error as Error)
      }

      try {
        conn.releaseLocalStream()
      } catch (error) {
        logger.error('Error releasing local stream:', error as Error)
      }

      try {
        conn.closePeerConnection()
      } catch (error) {
        logger.error('Error closing peer connection:', error as Error)
      }
    }

    // Clear stream state after releasing local streams and closing peer connections
    // to prevent stale references
    setLocalStream(null)
    setRemoteStream(null)

    if (sid && cid) {
      try {
        await video.updateVideoCallStatus(sid, cid, 'call_ended')
      } catch (error) {
        logger.error('Failed to update video call status:', error as Error)
      }
    }

    if (sid) {
      try {
        await video.endVideoSession(sid)
      } catch (error) {
        logger.error('Failed to end video session:', error as Error)
      }
    }

    setSession(null)
    setClientCallId(null)
  }, [video, logger])

  const startBackendKeepAlive = useCallback(() => {
    clearIntervalIfExists(backendKeepAliveTimerRef)

    const timer = setInterval(async () => {
      try {
        if (session && clientCallId) {
          await video.updateVideoCallStatus(session.session_id, clientCallId, 'call_in_call')
        } else {
          throw new Error(t('BCSC.VideoCall.MissingSessionOrCallId'))
        }
      } catch {
        // Just warn as one missed keep alive won't impact the call
        logger.warn('Backend keep-alive update failed')
      }
    }, KEEP_ALIVE_INTERVAL_MS)

    backendKeepAliveTimerRef.current = timer
  }, [session, clientCallId, video, logger, t])

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

      Analytics.trackErrorEvent({
        code: AnalyticsErrorCodeMap[type],
        message: error?.toString() ?? type,
      })

      setVideoCallError(videoCallError)
      setFlowState(VideoCallFlowState.ERROR)
      cleanup().catch((cleanupError) => {
        logger.error('Error during cleanup after video call error:', cleanupError)
      })
    },
    [cleanup, logger]
  )

  // 0. upload any required evidence before attempting to connect to the call, since it must be present in IDCheck
  const uploadPreCallEvidence = useCallback(async (): Promise<boolean> => {
    try {
      await uploadSelfiePhoto()
      const additionalEvidence = await processAdditionalEvidence()
      await uploadEvidenceBinaries(additionalEvidence)
    } catch (error) {
      handleError(VideoCallErrorType.DOCUMENT_UPLOAD_FAILED, error as Error)
      return false
    }
    return true
  }, [uploadSelfiePhoto, processAdditionalEvidence, uploadEvidenceBinaries, handleError])

  // 1. a session must be created before call can begin
  const createSession = useCallback(async (): Promise<VideoSession | null> => {
    try {
      const newSession = await video.createVideoSession()

      // If aborted while the request was in-flight, end the session
      // immediately so it doesn't leak on the backend
      if (abortedRef.current) {
        video.endVideoSession(newSession.session_id).catch((e) => {
          logger.error('Failed to end orphaned video session:', e as Error)
        })
        return null
      }

      sessionRef.current = newSession
      setSession(newSession)
      return newSession
    } catch (error) {
      handleError(VideoCallErrorType.SESSION_FAILED, error as Error)
      return null
    }
  }, [video, handleError, logger])

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

        // If aborted while connect was in-flight, tear down the
        // just-created connection immediately without storing it
        if (abortedRef.current) {
          conn.setAppInitiatedDisconnect(true)
          conn.stopPexipKeepAlive()
          conn.closePexipEventSource()
          conn.disconnectPexip().catch((e) => logger.error('Error disconnecting orphaned Pexip:', e as Error))
          conn.releaseLocalStream()
          conn.closePeerConnection()
          return false
        }

        conn.setAppInitiatedDisconnect(false)
        connectionRef.current = conn
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
        const call = await video.createVideoCall(sessionId, id, 'call_ringing')

        // If aborted while the API call was in-flight, mark the call as
        // ended immediately and don't store the id in refs/state
        if (abortedRef.current) {
          video.updateVideoCallStatus(sessionId, id, 'call_ended').catch((e) => {
            logger.error('Failed to end orphaned video call:', e as Error)
          })
          return null
        }

        clientCallIdRef.current = id
        setClientCallId(id)
        return call
      } catch (error) {
        handleError(VideoCallErrorType.CALL_FAILED, error as Error)
        return null
      }
    },
    [video, handleError, logger]
  )

  // three step process with the steps above
  // all of the functions within catch their own errors
  // each step checks abortedRef after its await and self-cleans any
  // resources it just allocated, so the between-step checks here are
  // simply early-outs to avoid starting the next step unnecessarily
  const startVideoCall = useCallback(async () => {
    abortedRef.current = false
    setFlowState(VideoCallFlowState.UPLOADING_DOCUMENTS)
    const uploaded = await uploadPreCallEvidence()
    if (!uploaded || abortedRef.current) {
      return
    }

    setFlowState(VideoCallFlowState.CREATING_SESSION)
    const newSession = await createSession()
    if (!newSession || abortedRef.current) {
      return
    }

    setFlowState(VideoCallFlowState.CONNECTING_WEBRTC)
    const connected = await establishWebRTCConnection(newSession)
    if (!connected || abortedRef.current) {
      return
    }

    const newCall = await createCall(newSession.session_id)
    if (!newCall || abortedRef.current) {
      return
    }
  }, [createSession, uploadPreCallEvidence, establishWebRTCConnection, createCall])

  // if the user encounters a retryable error, they can start the process again
  const retryConnection = useCallback(async () => {
    setVideoCallError(null)
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

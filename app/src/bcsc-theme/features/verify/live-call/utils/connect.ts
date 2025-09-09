import { BifoldLogger } from '@bifold/core'
import {
  callsWebrtcParticipant,
  disconnectCall,
  newCandidate,
  refreshToken,
  requestToken,
  withPin,
  withToken,
} from '@pexip/infinity-api'
import { mediaDevices, MediaStream, RTCIceCandidate, RTCPeerConnection } from 'react-native-webrtc'
import { RTCOfferOptions } from 'react-native-webrtc/lib/typescript/RTCUtil'
import { keepAliveIntervalMs, reconnectionGracePeriodMs } from '../constants'
import type { ConnectionRequest, ConnectResult } from '../types/live-call'

// WebRTC Events need handlers even if we don't do anything with some of them
const noop = () => {}

export const connect = async (
  req: ConnectionRequest & {
    onRemoteStream: (mediaStream: MediaStream) => void
    onRemoteDisconnect: () => void
  },
  logger: BifoldLogger
): Promise<ConnectResult> => {
  logger.info('Requesting user media (camera and microphone)...')
  const localStream = await mediaDevices.getUserMedia({
    audio: true,
    video: {
      frameRate: 30,
      facingMode: 'user',
    },
  })

  logger.info('Requesting Pexip Infinity token...')
  let response = await requestInfinityToken(req)

  if (response.status !== 200) {
    throw new Error('Cannot establish the connection. Pexip unavailable (1):', response.status)
  }

  const participantUuid = response.data.result.participant_uuid
  let currentToken = response.data.result.token

  logger.info('Creating WebRTC peer connection...')
  const peerConnection: RTCPeerConnection = await createPeerConnection(localStream)

  let connectionEstablished = false
  let remoteStreamReceived = false
  let disconnectHandled = false
  let disconnectTimeout: NodeJS.Timeout | null = null
  let appInitiatedDisconnect = false

  const handleDisconnect = () => {
    if (disconnectHandled || appInitiatedDisconnect) return
    logger.info('Handling remote disconnect')
    disconnectHandled = true
    req.onRemoteDisconnect?.()
  }

  peerConnection.addEventListener('connectionstatechange', () => {
    logger.info('Peer connection state changed', { state: peerConnection.connectionState })

    if (peerConnection.connectionState === 'connected') {
      logger.info('WebRTC connection established successfully')
      connectionEstablished = true
      if (disconnectTimeout) {
        logger.info('Clearing disconnect timeout due to successful reconnection')
        clearTimeout(disconnectTimeout)
        disconnectTimeout = null
      }
    }

    if (
      connectionEstablished &&
      remoteStreamReceived &&
      (peerConnection.connectionState === 'disconnected' ||
        peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'closed')
    ) {
      if (!disconnectTimeout) {
        disconnectTimeout = setTimeout(() => {
          if (
            peerConnection.connectionState === 'disconnected' ||
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'closed'
          ) {
            logger.warn('Grace period expired, triggering disconnect', { state: peerConnection.connectionState })
            handleDisconnect()
          }
        }, reconnectionGracePeriodMs)
      }
    }
  })

  peerConnection.addEventListener('icecandidateerror', noop)

  peerConnection.addEventListener('iceconnectionstatechange', () => {
    logger.info('ICE connection state changed', { state: peerConnection.iceConnectionState })

    if (
      connectionEstablished &&
      remoteStreamReceived &&
      (peerConnection.iceConnectionState === 'disconnected' ||
        peerConnection.iceConnectionState === 'failed' ||
        peerConnection.iceConnectionState === 'closed')
    ) {
      if (!disconnectTimeout) {
        disconnectTimeout = setTimeout(() => {
          if (
            peerConnection.iceConnectionState === 'disconnected' ||
            peerConnection.iceConnectionState === 'failed' ||
            peerConnection.iceConnectionState === 'closed'
          ) {
            logger.warn('ICE grace period expired, triggering disconnect', {
              iceState: peerConnection.iceConnectionState,
            })
            handleDisconnect()
          }
        }, reconnectionGracePeriodMs)
      }
    }
  })
  peerConnection.addEventListener('icegatheringstatechange', noop)
  peerConnection.addEventListener('negotiationneeded', noop)
  peerConnection.addEventListener('signalingstatechange', noop)
  peerConnection.addEventListener('track', (event) => {
    remoteStreamReceived = true
    const remoteStream = event.streams[0]
    req.onRemoteStream(remoteStream)
  })

  logger.info('Creating WebRTC offer...')
  const offer = await createOffer(peerConnection)

  logger.info('Initiating WebRTC call to Pexip...')
  response = await callToInfinity({
    nodeUrl: req.nodeUrl,
    conferenceAlias: req.conferenceAlias,
    participantUuid,
    token: currentToken,
    offer,
  })

  if (response.status !== 200) {
    throw new Error('Cannot establish the connection. Pexip unavailable (2):', response.status)
  }

  const callUuid = response.data.result.call_uuid
  logger.info('WebRTC call initiated successfully', { callUuid })
  peerConnection.addEventListener('icecandidate', (event) => {
    const iceCandidate = event.candidate
    if (iceCandidate != null) {
      logger.info('Sending ICE candidate to Pexip')
      sendCandidate({
        nodeUrl: req.nodeUrl,
        conferenceAlias: req.conferenceAlias,
        participantUuid: participantUuid,
        callUuid,
        token: currentToken,
        iceCandidate,
      })
    }
  })

  logger.info('Setting local and remote descriptions...')
  peerConnection.setLocalDescription(offer)
  peerConnection.setRemoteDescription({
    sdp: response.data.result.sdp,
    type: 'answer',
  })

  const disconnectPexip = async () => {
    logger.info('Disconnecting from Pexip call...', { callUuid })
    await disconnectCall({
      fetcher: withToken(fetch, currentToken),
      params: {
        conferenceAlias: req.conferenceAlias,
        participantUuid,
        callUuid,
      },
      host: req.nodeUrl,
    })
    logger.info('Pexip call disconnected successfully')
  }

  logger.info('Starting Pexip keep-alive timer', { intervalMs: keepAliveIntervalMs })
  const keepAliveInterval = setInterval(async () => {
    try {
      logger.info('Refreshing Pexip token...')
      const response = await refreshToken({
        fetcher: withToken(fetch, currentToken),
        params: {
          conferenceAlias: req.conferenceAlias,
        },
        host: req.nodeUrl,
      })

      if (response.status === 200 && response.data?.result?.token) {
        currentToken = response.data.result.token
        logger.info('Pexip token refreshed successfully')
      } else {
        logger.warn('Token refresh returned unexpected response', { status: response.status })
      }
    } catch (err) {
      logger.error('Pexip token refresh failed:', err as Error)
    }
  }, keepAliveIntervalMs)

  const stopPexipKeepAlive = () => {
    logger.info('Stopping Pexip keep-alive timer')
    clearInterval(keepAliveInterval)
  }

  const setAppInitiatedDisconnect = (value: boolean) => {
    appInitiatedDisconnect = value
  }

  logger.info('Video call connection established successfully', {
    callUuid,
    participantUuid,
  })

  return {
    localStream,
    callUuid,
    participantUuid,
    peerConnection,
    disconnectPexip,
    stopPexipKeepAlive,
    setAppInitiatedDisconnect,
  }
}

const requestInfinityToken = async (request: ConnectionRequest): Promise<any> => {
  const { nodeUrl, conferenceAlias, displayName, pin } = request

  const response = await requestToken({
    fetcher: pin != null ? withPin(fetch, pin) : fetch,
    body: {
      display_name: displayName,
    },
    params: {
      conferenceAlias: conferenceAlias,
    },
    host: nodeUrl,
  })

  return response
}

const createPeerConnection = async (localStream: MediaStream) => {
  const peerConstraints = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ],
  }

  const peerConnection = new RTCPeerConnection(peerConstraints)
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track)
  })

  return peerConnection
}

const createOffer = async (peerConnection: RTCPeerConnection) => {
  const sessionConstraints: RTCOfferOptions = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: true,
  }

  return await peerConnection.createOffer(sessionConstraints)
}

const callToInfinity = async (req: {
  nodeUrl: string
  conferenceAlias: string
  participantUuid: string
  token: string
  offer: any
}) => {
  return await callsWebrtcParticipant({
    fetcher: withToken(fetch, req.token),
    body: {
      call_type: 'WEBRTC',
      sdp: req.offer.sdp,
      media_type: 'video',
      fecc_supported: false,
    },
    params: {
      conferenceAlias: req.conferenceAlias,
      participantUuid: req.participantUuid,
    },
    host: req.nodeUrl,
  })
}

const sendCandidate = (req: {
  nodeUrl: string
  conferenceAlias: string
  participantUuid: string
  callUuid: string
  token: string
  iceCandidate: RTCIceCandidate
}) => {
  newCandidate({
    fetcher: withToken(fetch, req.token),
    body: {
      candidate: req.iceCandidate.candidate,
      mid: req.iceCandidate.sdpMid!,
    },
    params: {
      conferenceAlias: req.conferenceAlias,
      participantUuid: req.participantUuid,
      callUuid: req.callUuid,
    },
    host: req.nodeUrl,
  })
}

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
import { MediaStream, RTCIceCandidate, RTCPeerConnection, mediaDevices } from 'react-native-webrtc'
import { RTCOfferOptions } from 'react-native-webrtc/lib/typescript/RTCUtil'
import type { ConnectionRequest } from '../types/live-call'

// Allow a few seconds for graceful reconnection
const reconnectionGracePeriodMs = 3000
const keepAliveIntervalMs = 30000

// WebRTC Events need handlers even if we don't do anything with some of them
const noop = () => {}

export interface ConnectResult {
  localStream: MediaStream
  callUuid: string
  participantUuid: string
  peerConnection: RTCPeerConnection
  disconnectPexip: () => Promise<void>
  stopPexipKeepAlive: () => void
  setAppInitiatedDisconnect: (value: boolean) => void
}

export const connect = async (
  req: ConnectionRequest & {
    onRemoteStream: (mediaStream: MediaStream) => void
    onRemoteDisconnect: () => void
  },
  logger: BifoldLogger
): Promise<ConnectResult> => {
  const localStream = await mediaDevices.getUserMedia({
    audio: true,
    video: {
      frameRate: 30,
      facingMode: 'user',
    },
  })

  let response = await requestInfinityToken(req)

  if (response.status !== 200) {
    throw new Error('Cannot establish the connection. Pexip unavailable (1):', response.status)
  }

  const participantUuid = response.data.result.participant_uuid
  let currentToken = response.data.result.token

  const peerConnection: RTCPeerConnection = await createPeerConnection(localStream)

  let connectionEstablished = false
  let remoteStreamReceived = false
  let disconnectHandled = false
  let disconnectTimeout: NodeJS.Timeout | null = null
  let appInitiatedDisconnect = false

  const handleDisconnect = () => {
    if (disconnectHandled || appInitiatedDisconnect) return
    disconnectHandled = true
    req.onRemoteDisconnect?.()
  }

  peerConnection.addEventListener('connectionstatechange', () => {
    if (peerConnection.connectionState === 'connected') {
      connectionEstablished = true
      if (disconnectTimeout) {
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
            handleDisconnect()
          }
        }, reconnectionGracePeriodMs)
      }
    }
  })

  peerConnection.addEventListener('icecandidateerror', noop)

  peerConnection.addEventListener('iceconnectionstatechange', () => {
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

  const offer = await createOffer(peerConnection)

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
  peerConnection.addEventListener('icecandidate', (event) => {
    const iceCandidate = event.candidate
    if (iceCandidate != null) {
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

  peerConnection.setLocalDescription(offer)
  peerConnection.setRemoteDescription({
    sdp: response.data.result.sdp,
    type: 'answer',
  })

  const disconnectPexip = async () => {
    await disconnectCall({
      fetcher: withToken(fetch, currentToken),
      params: {
        conferenceAlias: req.conferenceAlias,
        participantUuid,
        callUuid,
      },
      host: req.nodeUrl,
    })
  }

  const keepAliveInterval = setInterval(async () => {
    try {
      const response = await refreshToken({
        fetcher: withToken(fetch, currentToken),
        params: {
          conferenceAlias: req.conferenceAlias,
        },
        host: req.nodeUrl,
      })

      if (response.status === 200 && response.data?.result?.token) {
        currentToken = response.data.result.token
      }
    } catch (err) {
      logger.error('Pexip token refresh failed:', err)
    }
  }, keepAliveIntervalMs)

  const stopPexipKeepAlive = () => {
    clearInterval(keepAliveInterval)
  }

  const setAppInitiatedDisconnect = (value: boolean) => {
    appInitiatedDisconnect = value
  }

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

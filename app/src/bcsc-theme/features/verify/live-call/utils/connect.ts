import { MediaStream, RTCIceCandidate, RTCPeerConnection, mediaDevices } from 'react-native-webrtc'
import type { ConnectionRequest } from '../types/live-call'
import { callsWebrtcParticipant, newCandidate, requestToken, withPin, withToken } from '@pexip/infinity-api'
import { Alert } from 'react-native'
import { RTCOfferOptions } from 'react-native-webrtc/lib/typescript/RTCUtil'

export const connect = async (
  req: ConnectionRequest & { onRemoteStream: (mediaStream: MediaStream) => void }
): Promise<any> => {
  let callUuid: string

  const localStream = await mediaDevices.getUserMedia({
    audio: true,
    video: {
      frameRate: 30,
      facingMode: 'user',
    },
  })

  let response = await requestInfinityToken(req)

  if (response.status !== 200) {
    Alert.alert('Cannot establish the connection. Check the PIN.')
    throw new Error('Cannot authenticate')
  }

  const participantUuid = response.data.result.participant_uuid
  const token = response.data.result.token

  const peerConnection = await createPeerConnection(localStream)
  peerConnection.addEventListener('connectionstatechange', (_event) => {
    console.log('Received connectionstatechange')
    console.log(peerConnection.connectionState)
  })
  peerConnection.addEventListener('icecandidate', (event) => {
    console.log('Received icecandidate')
    const iceCandidate = event.candidate
    if (iceCandidate != null) {
      sendCandidate({
        nodeUrl: req.nodeUrl,
        conferenceAlias: req.conferenceAlias,
        participantUuid: participantUuid,
        callUuid,
        token,
        iceCandidate,
      })
    }
  })
  peerConnection.addEventListener('icecandidateerror', (_event) => {
    console.log('Received icecandidateerror')
  })
  peerConnection.addEventListener('iceconnectionstatechange', (_event) => {
    console.log('Received iceconnectionstatechange')
  })
  peerConnection.addEventListener('icegatheringstatechange', (_event) => {
    console.log('Received icegatheringstatechange')
  })
  peerConnection.addEventListener('negotiationneeded', (_event) => {
    console.log('Received negotiationneeded')
  })
  peerConnection.addEventListener('signalingstatechange', (_event) => {
    console.log('Received signalingstatechange')
  })
  peerConnection.addEventListener('track', (event) => {
    console.log('Received track')
    req.onRemoteStream(event.streams[0])
  })
  const offer = await createOffer(peerConnection)

  response = await callToInfinity({
    nodeUrl: req.nodeUrl,
    conferenceAlias: req.conferenceAlias,
    participantUuid,
    token,
    offer,
  })

  if (response.status !== 200) {
    Alert.alert('Cannot establish the connection. Check the PIN.')
    throw new Error('Cannot authenticate')
  }

  callUuid = response.data.result.call_uuid
  console.log('Getting callUuid')
  console.log(response.data.result)

  // Send the offer to infinity and get the answer
  peerConnection.setLocalDescription(offer)

  peerConnection.setRemoteDescription({
    sdp: response.data.result.sdp,
    type: 'answer',
  })

  return localStream
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

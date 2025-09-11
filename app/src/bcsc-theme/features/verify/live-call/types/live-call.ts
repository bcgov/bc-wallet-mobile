import { MediaStream, RTCPeerConnection } from 'react-native-webrtc'

export interface ConnectionRequest {
  nodeUrl: string
  conferenceAlias: string
  displayName: string
  pin?: string
}

export enum VideoCallErrorType {
  CONNECTION_FAILED = 'connection_failed',
  SESSION_FAILED = 'session_failed',
  CALL_FAILED = 'call_failed',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
}

export interface VideoCallError {
  type: VideoCallErrorType
  message: string
  retryable: boolean
  technicalDetails?: string
}

export interface ConnectResult {
  localStream: MediaStream
  callUuid: string
  participantUuid: string
  peerConnection: RTCPeerConnection
  disconnectPexip: () => Promise<void>
  stopPexipKeepAlive: () => void
  setAppInitiatedDisconnect: (value: boolean) => void
}

export enum VideoCallFlowState {
  IDLE = 'idle',
  CREATING_SESSION = 'creating_session',
  CONNECTING_WEBRTC = 'connecting_webrtc',
  WAITING_FOR_AGENT = 'waiting_for_agent',
  IN_CALL = 'in_call',
  CALL_ENDED = 'call_ended',
  ERROR = 'error',
}

export enum VideoCallBackgroundMode {
  DISABLED = 'disabled',
  AUDIO_ONLY = 'audio_only',
  FULL_CLEANUP = 'full_cleanup',
}

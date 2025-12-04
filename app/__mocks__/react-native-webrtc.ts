export class RTCPeerConnection {
  connectionState = 'new'
  iceConnectionState = 'new'

  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  addTrack = jest.fn()
  createOffer = jest.fn().mockResolvedValue({ sdp: 'mock-sdp', type: 'offer' })
  setLocalDescription = jest.fn()
  setRemoteDescription = jest.fn()
  close = jest.fn()
}

export class RTCIceCandidate {
  candidate = 'mock-candidate'
  sdpMid = 'mock-mid'
  sdpMLineIndex = 0

  constructor(init?: any) {
    if (init) {
      this.candidate = init.candidate || this.candidate
      this.sdpMid = init.sdpMid || this.sdpMid
      this.sdpMLineIndex = init.sdpMLineIndex || this.sdpMLineIndex
    }
  }
}

export class MediaStream {
  id = 'mock-stream-id'
  active = true

  getTracks = jest.fn().mockReturnValue([])
  getAudioTracks = jest.fn().mockReturnValue([])
  getVideoTracks = jest.fn().mockReturnValue([])
  addTrack = jest.fn()
  removeTrack = jest.fn()
  clone = jest.fn()

  constructor() {
    this.clone.mockReturnValue(this)
  }
}

export class MediaStreamTrack {
  id = 'mock-track-id'
  kind = 'video'
  enabled = true

  stop = jest.fn()
}

export const mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue(new MediaStream()),
  enumerateDevices: jest.fn().mockResolvedValue([]),
}

export const RTCView = jest.fn(({ children }) => children)

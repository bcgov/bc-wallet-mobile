import { BifoldLogger } from '@bifold/core'
import { callsWebrtcParticipant, disconnectCall, releaseToken, requestToken } from '@pexip/infinity-api'
import type { Result as PexipTokenResult } from '@pexip/infinity-api/dist/token/types'
import { Platform } from 'react-native'
import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc'
import { buildIceServers, connect, createPeerConnection } from './connect'

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}))

jest.mock('react-native-webrtc', () => {
  const RTCPeerConnection = jest.fn(function (this: any, config) {
    this.config = config
  })
  Object.assign(RTCPeerConnection.prototype, {
    addTrack: jest.fn(),
    addEventListener: jest.fn(),
    createOffer: jest.fn(async () => ({ sdp: 'offer-sdp', type: 'offer' })),
    setLocalDescription: jest.fn(async () => {}),
    setRemoteDescription: jest.fn(async () => {}),
    close: jest.fn(),
  })
  return {
    RTCPeerConnection,
    mediaDevices: { getUserMedia: jest.fn() },
  }
})

jest.mock('react-native-sse', () =>
  jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    close: jest.fn(),
  }))
)

jest.mock('@pexip/infinity-api', () => ({
  callsWebrtcParticipant: jest.fn(),
  disconnectCall: jest.fn(),
  newCandidate: jest.fn(),
  refreshToken: jest.fn(),
  releaseToken: jest.fn(),
  requestToken: jest.fn(),
  withPin: jest.fn((fetcher) => fetcher),
  withToken: jest.fn((fetcher) => fetcher),
}))

const mockLogger: BifoldLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as BifoldLogger

const baseTokenResult: PexipTokenResult = {
  token: 'test-token',
  expires: '120',
  participant_uuid: 'test-uuid',
  display_name: 'Test User',
  role: 'GUEST',
  current_service_type: 'conference',
  version: {},
}

describe('buildIceServers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fall back to Google STUN when no STUN or TURN servers provided', () => {
    const result = buildIceServers(baseTokenResult, mockLogger)

    expect(result).toEqual([{ urls: 'stun:stun.l.google.com:19302' }])
    expect(mockLogger.warn).toHaveBeenCalledWith('No ICE servers from Pexip, falling back to Google public STUN')
  })

  it('should fall back to Google STUN when stun and turn are empty arrays', () => {
    const result = buildIceServers({ ...baseTokenResult, stun: [], turn: [] }, mockLogger)

    expect(result).toEqual([{ urls: 'stun:stun.l.google.com:19302' }])
  })

  it('should use STUN servers from token response', () => {
    const result = buildIceServers({ ...baseTokenResult, stun: [{ url: 'stun:pexip.example.com:3478' }] }, mockLogger)

    expect(result).toEqual([{ urls: 'stun:pexip.example.com:3478' }])
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('should use multiple STUN servers', () => {
    const result = buildIceServers(
      {
        ...baseTokenResult,
        stun: [{ url: 'stun:stun1.example.com:3478' }, { url: 'stun:stun2.example.com:3478' }],
      },
      mockLogger
    )

    expect(result).toEqual([{ urls: 'stun:stun1.example.com:3478' }, { urls: 'stun:stun2.example.com:3478' }])
  })

  it('should include STUN entries with empty url (passes through from Pexip)', () => {
    const result = buildIceServers(
      { ...baseTokenResult, stun: [{ url: '' }, { url: 'stun:valid.com:3478' }] },
      mockLogger
    )

    expect(result).toEqual([{ urls: '' }, { urls: 'stun:valid.com:3478' }])
  })

  it('should use TURN servers with credentials', () => {
    const result = buildIceServers(
      {
        ...baseTokenResult,
        turn: [
          {
            urls: ['turn:turn.example.com:3478?transport=udp', 'turn:turn.example.com:3478?transport=tcp'],
            username: 'user',
            credential: 'pass',
          },
        ],
      },
      mockLogger
    )

    expect(result).toEqual([
      {
        urls: ['turn:turn.example.com:3478?transport=udp', 'turn:turn.example.com:3478?transport=tcp'],
        username: 'user',
        credential: 'pass',
      },
    ])
  })

  it('should include TURN servers missing username (passes through from Pexip)', () => {
    const result = buildIceServers(
      {
        ...baseTokenResult,
        stun: [{ url: 'stun:stun.example.com:3478' }],
        turn: [{ urls: ['turn:turn.example.com:3478'], credential: 'pass' }],
      },
      mockLogger
    )

    expect(result).toEqual([
      { urls: 'stun:stun.example.com:3478' },
      { urls: ['turn:turn.example.com:3478'], credential: 'pass', username: undefined },
    ])
  })

  it('should include TURN servers missing credential (passes through from Pexip)', () => {
    const result = buildIceServers(
      {
        ...baseTokenResult,
        stun: [{ url: 'stun:stun.example.com:3478' }],
        turn: [{ urls: ['turn:turn.example.com:3478'], username: 'user' }],
      },
      mockLogger
    )

    expect(result).toEqual([
      { urls: 'stun:stun.example.com:3478' },
      { urls: ['turn:turn.example.com:3478'], username: 'user', credential: undefined },
    ])
  })

  it('should include TURN servers with empty string credentials (passes through from Pexip)', () => {
    const result = buildIceServers(
      {
        ...baseTokenResult,
        stun: [{ url: 'stun:stun.example.com:3478' }],
        turn: [{ urls: ['turn:turn.example.com:3478'], username: '', credential: '' }],
      },
      mockLogger
    )

    expect(result).toEqual([
      { urls: 'stun:stun.example.com:3478' },
      { urls: ['turn:turn.example.com:3478'], username: '', credential: '' },
    ])
  })

  it('should include TURN servers with empty urls array (passes through from Pexip)', () => {
    const result = buildIceServers(
      {
        ...baseTokenResult,
        stun: [{ url: 'stun:stun.example.com:3478' }],
        turn: [{ urls: [], username: 'user', credential: 'pass' }],
      },
      mockLogger
    )

    expect(result).toEqual([{ urls: 'stun:stun.example.com:3478' }, { urls: [], username: 'user', credential: 'pass' }])
  })

  it('should combine STUN and TURN servers', () => {
    const result = buildIceServers(
      {
        ...baseTokenResult,
        stun: [{ url: 'stun:stun.example.com:3478' }],
        turn: [{ urls: ['turn:turn.example.com:3478'], username: 'user', credential: 'pass' }],
      },
      mockLogger
    )

    expect(result).toEqual([
      { urls: 'stun:stun.example.com:3478' },
      { urls: ['turn:turn.example.com:3478'], username: 'user', credential: 'pass' },
    ])
  })

  it('should log the configured ICE server count', () => {
    buildIceServers(
      {
        ...baseTokenResult,
        stun: [{ url: 'stun:stun.example.com:3478' }],
        turn: [{ urls: ['turn:turn.example.com:3478'], username: 'user', credential: 'pass' }],
      },
      mockLogger
    )

    expect(mockLogger.info).toHaveBeenCalledWith('ICE servers configured:', { count: 2 })
  })
})

describe('createPeerConnection', () => {
  const mockLocalStream = {
    getTracks: jest.fn(() => []),
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should set iceTransportPolicy to 'nohost' on iOS", () => {
    Platform.OS = 'ios'

    createPeerConnection(mockLocalStream, baseTokenResult, mockLogger)

    const config = (RTCPeerConnection as jest.Mock).mock.calls[0][0]
    expect(config.iceTransportPolicy).toBe('nohost')
  })

  it('should not set iceTransportPolicy on Android', () => {
    Platform.OS = 'android'

    createPeerConnection(mockLocalStream, baseTokenResult, mockLogger)

    const config = (RTCPeerConnection as jest.Mock).mock.calls[0][0]
    expect(config.iceTransportPolicy).toBeUndefined()
  })

  it('should include iceServers in configuration on all platforms', () => {
    Platform.OS = 'android'

    createPeerConnection(
      mockLocalStream,
      {
        ...baseTokenResult,
        stun: [{ url: 'stun:example.com:3478' }],
      },
      mockLogger
    )

    const config = (RTCPeerConnection as jest.Mock).mock.calls[0][0]
    expect(config.iceServers).toEqual([{ urls: 'stun:example.com:3478' }])
  })
})

describe('connect', () => {
  const mockGetUserMedia = mediaDevices.getUserMedia as jest.Mock
  const mockRequestToken = requestToken as jest.Mock
  const mockCallsWebrtcParticipant = callsWebrtcParticipant as jest.Mock
  const mockDisconnectCall = disconnectCall as jest.Mock
  const mockReleaseToken = releaseToken as jest.Mock
  const track = { stop: jest.fn() }
  const localStream = { getTracks: jest.fn(() => [track]) }
  const request = {
    nodeUrl: 'https://pexip.example.com',
    conferenceAlias: 'room',
    displayName: 'Test User',
    pin: '1234',
    onRemoteStream: jest.fn(),
    onRemoteDisconnect: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockGetUserMedia.mockResolvedValue(localStream)
    mockRequestToken.mockResolvedValue({ status: 200, data: { result: baseTokenResult } })
    mockCallsWebrtcParticipant.mockResolvedValue({
      status: 200,
      data: { result: { call_uuid: 'call-uuid', sdp: 'answer-sdp' } },
    })
    mockDisconnectCall.mockResolvedValue({ status: 200 })
    mockReleaseToken.mockResolvedValue({ status: 200, data: { status: 'success', result: true } })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('releases the Pexip token when disconnecting', async () => {
    const conn = await connect(request, mockLogger)
    conn.stopPexipKeepAlive()

    await conn.disconnectPexip()

    expect(disconnectCall).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { conferenceAlias: 'room', participantUuid: 'test-uuid', callUuid: 'call-uuid' },
      })
    )
    expect(releaseToken).toHaveBeenCalledWith(
      expect.objectContaining({ params: { conferenceAlias: 'room' }, host: 'https://pexip.example.com' })
    )
  })

  it('treats a 403 release response as already released by the server', async () => {
    mockReleaseToken.mockResolvedValue({ status: 403, data: { status: 'failed', result: 'Forbidden' } })
    const conn = await connect(request, mockLogger)
    conn.stopPexipKeepAlive()

    await expect(conn.disconnectPexip()).resolves.toBeUndefined()
    expect(mockLogger.info).toHaveBeenCalledWith('Pexip token already released by the server')
    expect(mockLogger.error).not.toHaveBeenCalledWith('Failed to release Pexip token:', expect.anything())
  })

  it('logs a failed release when Pexip responds with result: false', async () => {
    mockReleaseToken.mockResolvedValue({ status: 200, data: { status: 'success', result: false } })
    const conn = await connect(request, mockLogger)
    conn.stopPexipKeepAlive()

    await expect(conn.disconnectPexip()).resolves.toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to release Pexip token:',
      expect.objectContaining({ message: expect.stringContaining('Pexip did not release the token') })
    )
    expect(mockLogger.info).not.toHaveBeenCalledWith('Pexip token released successfully')
  })

  it('still releases the Pexip token when the call disconnect fails', async () => {
    mockDisconnectCall.mockRejectedValue(new Error('network'))
    const conn = await connect(request, mockLogger)
    conn.stopPexipKeepAlive()

    await conn.disconnectPexip()

    expect(releaseToken).toHaveBeenCalled()
  })

  it('releases the token, peer connection and local tracks when setup fails after acquiring a token', async () => {
    mockCallsWebrtcParticipant.mockResolvedValue({ status: 502, data: {} })

    await expect(connect(request, mockLogger)).rejects.toThrow()

    expect(releaseToken).toHaveBeenCalled()
    expect(RTCPeerConnection.prototype.close).toHaveBeenCalled()
    expect(track.stop).toHaveBeenCalled()
  })

  it('stops local tracks without releasing a token when the token request fails', async () => {
    mockRequestToken.mockResolvedValue({ status: 403, data: {} })

    await expect(connect(request, mockLogger)).rejects.toThrow()

    expect(releaseToken).not.toHaveBeenCalled()
    expect(track.stop).toHaveBeenCalled()
  })
})

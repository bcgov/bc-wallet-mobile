import { BifoldLogger } from '@bifold/core'
import type { Result as PexipTokenResult } from '@pexip/infinity-api/dist/token/types'
import { buildIceServers } from './connect'

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

    expect(result).toEqual([{ url: 'stun:stun.l.google.com:19302' }])
    expect(mockLogger.warn).toHaveBeenCalledWith('No ICE servers from Pexip, falling back to Google public STUN')
  })

  it('should fall back to Google STUN when stun and turn are empty arrays', () => {
    const result = buildIceServers({ ...baseTokenResult, stun: [], turn: [] }, mockLogger)

    expect(result).toEqual([{ url: 'stun:stun.l.google.com:19302' }])
  })

  it('should use STUN servers from token response', () => {
    const result = buildIceServers({ ...baseTokenResult, stun: [{ url: 'stun:pexip.example.com:3478' }] }, mockLogger)

    expect(result).toEqual([{ url: 'stun:pexip.example.com:3478' }])
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

    expect(result).toEqual([{ url: 'stun:stun1.example.com:3478' }, { url: 'stun:stun2.example.com:3478' }])
  })

  it('should include STUN entries with empty url (passes through from Pexip)', () => {
    const result = buildIceServers(
      { ...baseTokenResult, stun: [{ url: '' }, { url: 'stun:valid.com:3478' }] },
      mockLogger
    )

    expect(result).toEqual([{ url: '' }, { url: 'stun:valid.com:3478' }])
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
      { url: 'stun:stun.example.com:3478' },
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
      { url: 'stun:stun.example.com:3478' },
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
      { url: 'stun:stun.example.com:3478' },
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

    expect(result).toEqual([{ url: 'stun:stun.example.com:3478' }, { urls: [], username: 'user', credential: 'pass' }])
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
      { url: 'stun:stun.example.com:3478' },
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

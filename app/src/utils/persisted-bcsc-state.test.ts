import { sanitizePersistedBCSCState } from './persisted-bcsc-state'

const createMockLogger = () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) as any

describe('sanitizePersistedBCSCState', () => {
  it('returns a valid full blob unchanged, with no log and no rejected keys', () => {
    const logger = createMockLogger()
    const raw = {
      appVersion: '4.1.0',
      appBuildNumber: '100',
      hasAccount: true,
      selectedNickname: 'My Phone',
      bannerMessages: [{ id: 'IASServerNotificationBanner', type: 'info', title: 'Hello', dismissible: true }],
      analyticsOptIn: true,
      installId: 'install-1',
      verificationSkipped: true,
    }

    const result = sanitizePersistedBCSCState(raw, logger)

    expect(result).toEqual({ state: raw, rejectedKeys: [] })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('drops a wrong-typed top-level field, keeps other keys, and logs only path + code', () => {
    const logger = createMockLogger()
    const raw = { analyticsOptIn: 'yes', installId: 'keep-me' }

    const result = sanitizePersistedBCSCState(raw, logger)

    expect(result.state).toEqual({ installId: 'keep-me' })
    expect(result.rejectedKeys).toEqual(['analyticsOptIn'])
    expect(logger.warn).toHaveBeenCalledTimes(1)
    const [, loggedData] = logger.warn.mock.calls[0]
    expect(loggedData).toEqual({ path: 'analyticsOptIn', code: 'invalid_type' })
    expect(JSON.stringify(loggedData)).not.toContain('yes')
  })

  it('drops the whole credentialMetadata object on a nested field failure', () => {
    const logger = createMockLogger()
    const raw = {
      installId: 'keep-me',
      credentialMetadata: {
        fullName: 'Steve Brule',
        bcscReason: 'renewal',
        deviceCount: '3',
        deviceLimit: 5,
        cardType: 'BCSC',
        lastUpdated: 123,
      },
    }

    const result = sanitizePersistedBCSCState(raw, logger)

    expect(result.state).toEqual({ installId: 'keep-me' })
    expect(result.rejectedKeys).toEqual(['credentialMetadata'])
    expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
      path: 'credentialMetadata.deviceCount',
      code: 'invalid_type',
    })
  })

  describe('bannerMessages', () => {
    it('drops the whole array when a banner has a non-string title', () => {
      const logger = createMockLogger()
      const raw = {
        bannerMessages: [{ id: 'IASServerNotificationBanner', type: 'info', title: {} }],
      }

      const result = sanitizePersistedBCSCState(raw, logger)

      expect(result.state).toEqual({})
      expect(result.rejectedKeys).toEqual(['bannerMessages'])
      expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
        path: 'bannerMessages.0.title',
        code: 'invalid_type',
      })
    })

    it('drops the whole array when a banner has a non-boolean dismissible', () => {
      const logger = createMockLogger()
      const raw = {
        bannerMessages: [{ id: 'IASServerNotificationBanner', type: 'info', dismissible: 'yes' }],
      }

      const result = sanitizePersistedBCSCState(raw, logger)

      expect(result.state).toEqual({})
      expect(result.rejectedKeys).toEqual(['bannerMessages'])
    })

    it('passes a valid banner with only id and type', () => {
      const logger = createMockLogger()
      const raw = { bannerMessages: [{ id: 'IASServerNotificationBanner', type: 'info' }] }

      const result = sanitizePersistedBCSCState(raw, logger)

      expect(result).toEqual({ state: raw, rejectedKeys: [] })
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('earlier-version blobs', () => {
    it('passes a legacy reportUUID blob through untouched', () => {
      const logger = createMockLogger()
      const raw = { reportUUID: 'x', hasAccount: true }

      const result = sanitizePersistedBCSCState(raw, logger)

      expect(result).toEqual({ state: raw, rejectedKeys: [] })
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('preserves an unknown key (loose passthrough)', () => {
      const logger = createMockLogger()
      const raw = { installId: 'keep-me', someFutureField: 'future-value' }

      const result = sanitizePersistedBCSCState(raw, logger)

      expect(result).toEqual({ state: raw, rejectedKeys: [] })
    })
  })

  describe('non-object input', () => {
    it.each([['corrupt'], [null], [[]]])('returns empty state with a single warn for %p, and never throws', (value) => {
      const logger = createMockLogger()

      const result = sanitizePersistedBCSCState(value, logger)

      expect(result).toEqual({ state: {}, rejectedKeys: [] })
      expect(logger.warn).toHaveBeenCalledTimes(1)
      const [, loggedData] = logger.warn.mock.calls[0]
      expect(loggedData.path).toBe('')
    })
  })
})

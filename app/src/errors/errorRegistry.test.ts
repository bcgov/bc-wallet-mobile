import { ErrorCategory, ErrorRegistry, ErrorRegistryKey, ErrorSeverity } from './errorRegistry'

describe('errorRegistry', () => {
  // These strings are serialized into AppError.code and shipped to analytics/Loki, so the
  // exact set is a wire contract — asserting the whole set catches additions as well as renames.
  describe('ErrorSeverity', () => {
    it('should have all expected severity levels', () => {
      expect(Object.values(ErrorSeverity).sort()).toEqual(['critical', 'error', 'info', 'warning'])
    })
  })

  describe('ErrorCategory', () => {
    it('should have all expected categories', () => {
      expect(Object.values(ErrorCategory).sort()).toEqual([
        'auth',
        'camera',
        'connection',
        'credential',
        'device',
        'general',
        'network',
        'proof',
        'storage',
        'token',
        'unknown',
        'verification',
        'wallet',
      ])
    })
  })

  describe('ErrorRegistry', () => {
    it('should contain no duplicate codes', () => {
      const codes = Object.values(ErrorRegistry).map((error) => error.statusCode)
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(codes.length)
    })

    it('should contain no duplicate app events', () => {
      const appEvents = Object.values(ErrorRegistry).map((error) => error.appEvent)
      const uniqueAppEvents = new Set(appEvents)
      expect(uniqueAppEvents.size).toBe(appEvents.length)
    })

    // Deliberately untyped strings: a typed `ErrorRegistryKey[]` would only fail the TS build,
    // whereas plain strings make a rename or removal fail here with the offending key named.
    it('should contain all expected error keys', () => {
      const expectedKeys = [
        'CAMERA_BROKEN',
        'INVALID_QR_CODE',
        'NO_INTERNET',
        'SERVER_ERROR',
        'SERVER_TIMEOUT',
        'LOGIN_PARSE_URI',
        'LOGIN_REJECTED_401',
        'CARD_EXPIRED_WILL_REMOVE',
        'VERIFY_NOT_COMPLETE',
        'VIDEO_VERIFY_NOT_COMPLETE',
        'INVALID_TOKEN',
        'TOKEN_NULL',
        'STORAGE_WRITE_ERROR',
        'STORAGE_READ_ERROR',
        'ANDROID_APP_UPDATE_REQUIRED',
        'IOS_APP_UPDATE_REQUIRED',
        'GENERAL_ERROR',
        'DYNAMIC_REGISTRATION_ERROR',
        'STATE_LOAD_ERROR',
        'AGENT_INITIALIZATION_ERROR',
        'WALLET_SECRET_NOT_FOUND',
        'PARSE_INVITATION_ERROR',
        'RECEIVE_INVITATION_ERROR',
        'ATTESTATION_BAD_INVITATION',
        'ATTESTATION_CONNECTION_ERROR',
      ]

      expect(Object.keys(ErrorRegistry)).toEqual(expect.arrayContaining(expectedKeys))
    })

    it('should have valid error definitions with all required fields', () => {
      const errorKeys = Object.keys(ErrorRegistry) as ErrorRegistryKey[]

      errorKeys.forEach((key) => {
        const definition = ErrorRegistry[key]

        expect(definition.statusCode).toBeDefined()
        expect(typeof definition.statusCode).toBe('number')

        expect(definition.appEvent).toBeDefined()
        expect(typeof definition.appEvent).toBe('string')

        expect(definition.severity).toBeDefined()
        expect(Object.values(ErrorSeverity)).toContain(definition.severity)

        expect(definition.category).toBeDefined()
        expect(Object.values(ErrorCategory)).toContain(definition.category)

        expect(definition.message).toBeDefined()
        expect(typeof definition.message).toBe('string')
      })
    })

    it('should have error codes in correct ranges', () => {
      // Camera/Scanning Errors (2000-2099)
      expect(ErrorRegistry.CAMERA_BROKEN.statusCode).toBeGreaterThanOrEqual(2000)
      expect(ErrorRegistry.CAMERA_BROKEN.statusCode).toBeLessThan(2100)

      // Network Errors (2100-2199)
      expect(ErrorRegistry.NO_INTERNET.statusCode).toBeGreaterThanOrEqual(2100)
      expect(ErrorRegistry.NO_INTERNET.statusCode).toBeLessThan(2200)

      // Authentication/Login Errors (2200-2299)
      expect(ErrorRegistry.LOGIN_PARSE_URI.statusCode).toBeGreaterThanOrEqual(2200)
      expect(ErrorRegistry.LOGIN_PARSE_URI.statusCode).toBeLessThan(2300)

      // Credential/Card Errors (2300-2399)
      expect(ErrorRegistry.CARD_EXPIRED_WILL_REMOVE.statusCode).toBeGreaterThanOrEqual(2300)
      expect(ErrorRegistry.CARD_EXPIRED_WILL_REMOVE.statusCode).toBeLessThan(2400)

      // Verification Errors (2400-2499)
      expect(ErrorRegistry.VERIFY_NOT_COMPLETE.statusCode).toBeGreaterThanOrEqual(2400)
      expect(ErrorRegistry.VERIFY_NOT_COMPLETE.statusCode).toBeLessThan(2500)

      // Token/Crypto Errors (2500-2599)
      expect(ErrorRegistry.INVALID_TOKEN.statusCode).toBeGreaterThanOrEqual(2500)
      expect(ErrorRegistry.INVALID_TOKEN.statusCode).toBeLessThan(2600)

      // Storage Errors (2600-2699)
      expect(ErrorRegistry.STORAGE_WRITE_ERROR.statusCode).toBeGreaterThanOrEqual(2600)
      expect(ErrorRegistry.STORAGE_WRITE_ERROR.statusCode).toBeLessThan(2700)

      // Device Errors (2700-2799)
      expect(ErrorRegistry.ANDROID_APP_UPDATE_REQUIRED.statusCode).toBeGreaterThanOrEqual(2700)
      expect(ErrorRegistry.ANDROID_APP_UPDATE_REQUIRED.statusCode).toBeLessThan(2800)

      // General/Registration Errors (2800-2899)
      expect(ErrorRegistry.GENERAL_ERROR.statusCode).toBeGreaterThanOrEqual(2800)
      expect(ErrorRegistry.GENERAL_ERROR.statusCode).toBeLessThan(2900)

      // Wallet/Agent Errors (2900-2999)
      expect(ErrorRegistry.STATE_LOAD_ERROR.statusCode).toBeGreaterThanOrEqual(2900)
      expect(ErrorRegistry.STATE_LOAD_ERROR.statusCode).toBeLessThan(3000)

      // Connection/BCID Errors (3000-3099)
      expect(ErrorRegistry.PARSE_INVITATION_ERROR.statusCode).toBeGreaterThanOrEqual(3000)
      expect(ErrorRegistry.PARSE_INVITATION_ERROR.statusCode).toBeLessThan(3100)

      // Attestation Errors (3100-3199)
      expect(ErrorRegistry.ATTESTATION_BAD_INVITATION.statusCode).toBeGreaterThanOrEqual(3100)
      expect(ErrorRegistry.ATTESTATION_BAD_INVITATION.statusCode).toBeLessThan(3200)
    })
  })

  describe('ErrorRegistryKey type', () => {
    it('should allow accessing registry with valid keys', () => {
      const key: ErrorRegistryKey = 'CAMERA_BROKEN'
      const definition = ErrorRegistry[key]

      expect(definition).toBeDefined()
      expect(definition.statusCode).toBe(2000)
    })
  })
})

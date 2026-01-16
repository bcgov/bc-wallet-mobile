import { ErrorCategory, ErrorRegistry, ErrorRegistryKey, ErrorSeverity } from './errorRegistry'

describe('errorRegistry', () => {
  describe('ErrorSeverity', () => {
    it('should have all expected severity levels', () => {
      expect(ErrorSeverity.INFO).toBe('info')
      expect(ErrorSeverity.WARNING).toBe('warning')
      expect(ErrorSeverity.ERROR).toBe('error')
      expect(ErrorSeverity.CRITICAL).toBe('critical')
    })
  })

  describe('ErrorCategory', () => {
    it('should have all expected categories', () => {
      expect(ErrorCategory.CAMERA).toBe('camera')
      expect(ErrorCategory.NETWORK).toBe('network')
      expect(ErrorCategory.AUTHENTICATION).toBe('auth')
      expect(ErrorCategory.CREDENTIAL).toBe('credential')
      expect(ErrorCategory.PROOF).toBe('proof')
      expect(ErrorCategory.CONNECTION).toBe('connection')
      expect(ErrorCategory.WALLET).toBe('wallet')
      expect(ErrorCategory.VERIFICATION).toBe('verification')
      expect(ErrorCategory.DEVICE).toBe('device')
      expect(ErrorCategory.STORAGE).toBe('storage')
      expect(ErrorCategory.TOKEN).toBe('token')
      expect(ErrorCategory.GENERAL).toBe('general')
    })
  })

  describe('ErrorRegistry', () => {
    it('should contain all expected error keys', () => {
      // Camera errors
      expect(ErrorRegistry.CAMERA_BROKEN).toBeDefined()
      expect(ErrorRegistry.INVALID_QR_CODE).toBeDefined()

      // Network errors
      expect(ErrorRegistry.NO_INTERNET).toBeDefined()
      expect(ErrorRegistry.SERVER_ERROR).toBeDefined()
      expect(ErrorRegistry.SERVER_TIMEOUT).toBeDefined()

      // Auth errors
      expect(ErrorRegistry.LOGIN_PARSE_URI).toBeDefined()
      expect(ErrorRegistry.LOGIN_REJECTED_401).toBeDefined()

      // Credential errors
      expect(ErrorRegistry.CARD_EXPIRED_WILL_REMOVE).toBeDefined()
      expect(ErrorRegistry.CREDENTIAL_NULL).toBeDefined()

      // Verification errors
      expect(ErrorRegistry.VERIFY_NOT_COMPLETE).toBeDefined()
      expect(ErrorRegistry.VIDEO_VERIFY_NOT_COMPLETE).toBeDefined()

      // Token errors
      expect(ErrorRegistry.INVALID_TOKEN).toBeDefined()
      expect(ErrorRegistry.TOKEN_NULL).toBeDefined()

      // Storage errors
      expect(ErrorRegistry.STORAGE_WRITE_ERROR).toBeDefined()
      expect(ErrorRegistry.STORAGE_READ_ERROR).toBeDefined()

      // Device errors
      expect(ErrorRegistry.ANDROID_APP_UPDATE_REQUIRED).toBeDefined()
      expect(ErrorRegistry.IOS_APP_UPDATE_REQUIRED).toBeDefined()

      // General errors
      expect(ErrorRegistry.GENERAL_ERROR).toBeDefined()
      expect(ErrorRegistry.DYNAMIC_REGISTRATION_ERROR).toBeDefined()

      // Wallet errors
      expect(ErrorRegistry.STATE_LOAD_ERROR).toBeDefined()
      expect(ErrorRegistry.AGENT_INITIALIZATION_ERROR).toBeDefined()
      expect(ErrorRegistry.WALLET_SECRET_NOT_FOUND).toBeDefined()

      // Connection errors
      expect(ErrorRegistry.PARSE_INVITATION_ERROR).toBeDefined()
      expect(ErrorRegistry.RECEIVE_INVITATION_ERROR).toBeDefined()

      // Attestation errors
      expect(ErrorRegistry.ATTESTATION_BAD_INVITATION).toBeDefined()
      expect(ErrorRegistry.ATTESTATION_CONNECTION_ERROR).toBeDefined()
    })

    it('should have valid error definitions with all required fields', () => {
      const errorKeys = Object.keys(ErrorRegistry) as ErrorRegistryKey[]

      errorKeys.forEach((key) => {
        const definition = ErrorRegistry[key]

        expect(definition.statusCode).toBeDefined()
        expect(typeof definition.statusCode).toBe('number')

        expect(definition.appEvent).toBeDefined()
        expect(typeof definition.appEvent).toBe('string')

        expect(definition.titleKey).toBeDefined()
        expect(typeof definition.titleKey).toBe('string')

        expect(definition.descriptionKey).toBeDefined()
        expect(typeof definition.descriptionKey).toBe('string')

        expect(definition.severity).toBeDefined()
        expect(Object.values(ErrorSeverity)).toContain(definition.severity)

        expect(definition.category).toBeDefined()
        expect(Object.values(ErrorCategory)).toContain(definition.category)
      })
    })

    it('should have unique error codes', () => {
      const errorKeys = Object.keys(ErrorRegistry) as ErrorRegistryKey[]
      const codes = errorKeys.map((key) => ErrorRegistry[key].statusCode)
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(codes.length)
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

    it('should have proper i18n key formats', () => {
      const errorKeys = Object.keys(ErrorRegistry) as ErrorRegistryKey[]

      errorKeys.forEach((key) => {
        const definition = ErrorRegistry[key]

        // Title keys should be in format 'BCWalletError.Category.Title' or 'Error.Title...'
        expect(definition.titleKey).toMatch(/^(BCWalletError\..+\.Title|Error\.Title\d+)$/)

        // Description keys should be in format 'BCWalletError.Category.Something'
        expect(definition.descriptionKey).toMatch(/^(BCWalletError\..+\..+|Error\.Message\d+)$/)
      })
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

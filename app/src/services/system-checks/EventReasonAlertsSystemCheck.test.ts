import { tokenToCredentialMetadata } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { SystemCheckNavigation, SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'

describe('EventReasonAlertsSystemCheck', () => {
  let mockUtils: SystemCheckUtils
  let mockNavigation: SystemCheckNavigation

  const createMockIdToken = (overrides?: Partial<IdToken>): IdToken => ({
    sub: 'test-sub',
    aud: 'test-aud',
    iss: 'test-iss',
    exp: 1234567890,
    iat: '1234567890',
    jti: 'test-jti',
    family_name: 'Test',
    given_name: 'User',
    bcsc_card_type: 'Combined' as any,
    bcsc_event: BCSCEvent.Authorization,
    bcsc_reason: BCSCReason.ApprovedByAgent,
    bcsc_status_date: 1234567890,
    acr: 0,
    bcsc_devices_count: 1,
    bcsc_max_devices: 5,
    hasActivePersonCredential: true,
    bcsc_account_type: 'BC Services Card with photo' as any,
    ...overrides,
  })

  beforeEach(() => {
    jest.resetAllMocks()

    mockUtils = {
      dispatch: jest.fn(),
      translation: jest.fn((key: string) => key) as any,
      logger: {
        error: jest.fn(),
        warn: jest.fn(),
      } as any,
    }

    mockNavigation = {
      getState: jest.fn().mockReturnValue({
        routes: [{ name: 'Home' }],
        index: 0,
      }),
      navigate: jest.fn(),
      canGoBack: jest.fn().mockReturnValue(false),
      goBack: jest.fn(),
    } as any
  })

  describe('runCheck', () => {
    it('should return false when the event is Cancel and reason is Cancel', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Cancel, bcsc_reason: BCSCReason.Cancel })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )

      expect(await check.runCheck()).toBe(false)
    })

    it('should return false when the event is Cancel and reason is CanceledByAgent', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Cancel, bcsc_reason: BCSCReason.CanceledByAgent })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )

      expect(await check.runCheck()).toBe(false)
    })

    it('should return false when the event is Cancel and reason is CanceledByUser', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Cancel, bcsc_reason: BCSCReason.CanceledByUser })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )

      expect(await check.runCheck()).toBe(false)
    })

    it('should return false when the event is Cancel and reason is CanceledByAdditionalCard', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Cancel,
        bcsc_reason: BCSCReason.CanceledByAdditionalCard,
      })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )

      expect(await check.runCheck()).toBe(false)
    })

    it('should return false when the reason is Renew and the metadata is different', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Renewal, bcsc_reason: BCSCReason.Renew })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )

      expect(await check.runCheck()).toBe(false)
    })

    it('should return true when the reason is Renew and the metadata is the same', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Renewal, bcsc_reason: BCSCReason.Renew })
      const metadata = tokenToCredentialMetadata(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        metadata,
        mockUtils,
        mockNavigation
      )

      expect(await check.runCheck()).toBe(true)
    })

    it('should return false when the reason is Replace and the metadata is different', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Replace, bcsc_reason: BCSCReason.Replace })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )

      expect(await check.runCheck()).toBe(false)
    })

    it('should return true when the reason is Replace and the metadata is the same', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Replace, bcsc_reason: BCSCReason.Replace })
      const metadata = tokenToCredentialMetadata(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        metadata,
        mockUtils,
        mockNavigation
      )

      expect(await check.runCheck()).toBe(true)
    })
  })

  describe('onFail', () => {
    it('should navigate to DeviceInvalidated modal when event is Cancel', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Cancel, bcsc_reason: BCSCReason.Cancel })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )
      await check.runCheck()
      check.onFail()

      expect(mockUtils.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA })
      )
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        expect.stringContaining('DeviceInvalidated'),
        expect.objectContaining({ invalidationReason: BCSCReason.Cancel })
      )
    })

    it('should dispatch SET_CARD_RENEWAL_NOTIFICATION when event is Renewal', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Renewal, bcsc_reason: BCSCReason.Renew })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )
      await check.runCheck()
      check.onFail()

      expect(mockUtils.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA })
      )
      expect(mockUtils.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_CARD_RENEWAL_NOTIFICATION, payload: [true] })
      )
    })

    it('should dispatch SET_ACCOUNT_EXPIRY_NOTIFICATION when event is Replace', async () => {
      const mockIdToken = createMockIdToken({ bcsc_event: BCSCEvent.Replace, bcsc_reason: BCSCReason.Replace })
      const check = new EventReasonAlertsSystemCheck(
        jest.fn().mockResolvedValue(mockIdToken),
        undefined,
        mockUtils,
        mockNavigation
      )
      await check.runCheck()
      check.onFail()

      expect(mockUtils.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_CREDENTIAL_METADATA })
      )
      expect(mockUtils.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.SET_ACCOUNT_EXPIRY_NOTIFICATION, payload: [true] })
      )
    })
  })
})

import { tokenToCredentialMetadata } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { AppEventCode } from '@/events/appEventCode'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { SystemCheckNavigation, SystemCheckUtils } from '@/services/system-checks/system-checks'

describe('EventReasonAlertsSystemCheck', () => {
  let mockUtils: SystemCheckUtils
  let mockNavigation: SystemCheckNavigation
  let emitAlert: jest.Mock

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

    emitAlert = jest.fn()

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
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Cancel,
        bcsc_reason: BCSCReason.Cancel,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })

    it('should return false when the event is Cancel and reason is CanceledByAgent', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Cancel,
        bcsc_reason: BCSCReason.CanceledByAgent,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })

    it('should return false when the event is Cancel and reason is CanceledByUser', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Cancel,
        bcsc_reason: BCSCReason.CanceledByUser,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })

    it('should return false when the event is Cancel and reason is CanceledByAdditionalCard', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Cancel,
        bcsc_reason: BCSCReason.CanceledByAdditionalCard,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })

    it('should return false when the reason is Renew and the metadata is different', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Renewal,
        bcsc_reason: BCSCReason.Renew,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })

    it('should return true when the reason is Renew and the metadata is the same', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Renewal,
        bcsc_reason: BCSCReason.Renew,
      })

      const metadata = tokenToCredentialMetadata(mockIdToken)

      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, metadata, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(true)
    })

    it('should return false when the reason is Replace and the metadata is different', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Replace,
        bcsc_reason: BCSCReason.Replace,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })
    it('should return true when the reason is Replace and the metadata is the same', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Replace,
        bcsc_reason: BCSCReason.Replace,
      })

      const metadata = tokenToCredentialMetadata(mockIdToken)

      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, metadata, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(true)
    })
  })

  describe('onFail', () => {
    it('should navigate to DeviceInvalidated modal when reason Cancel', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Cancel,
        bcsc_reason: BCSCReason.Cancel,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })
    it('should render an alert with CARD_STATUS_UPDATED event when reason Renew', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Renewal,
        bcsc_reason: BCSCReason.Renew,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)
      await check.runCheck()
      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith(
        'Alerts.AccountUpdated.Title',
        'Alerts.AccountUpdated.Description',
        expect.objectContaining({
          event: AppEventCode.CARD_STATUS_UPDATED,
          actions: [
            {
              text: 'Alerts.Actions.DefaultOK',
              style: 'cancel',
            },
          ],
        })
      )
    })
    it('should render an alert with CARD_TYPE_CHANGED event when reason Replace', async () => {
      const mockIdToken = createMockIdToken({
        bcsc_event: BCSCEvent.Replace,
        bcsc_reason: BCSCReason.Replace,
      })
      const getIdToken = jest.fn().mockResolvedValue(mockIdToken)
      const check = new EventReasonAlertsSystemCheck(getIdToken, emitAlert, undefined, mockUtils, mockNavigation)
      await check.runCheck()
      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith(
        'Alerts.AccountUpdated.Title',
        'Alerts.AccountUpdated.Description',
        expect.objectContaining({
          event: AppEventCode.CARD_TYPE_CHANGED,
          actions: [
            {
              text: 'Alerts.Actions.DefaultOK',
              style: 'cancel',
            },
          ],
        })
      )
    })
  })
})

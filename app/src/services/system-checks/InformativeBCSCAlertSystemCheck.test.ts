import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { AppEventCode } from '@/events/appEventCode'
import { InformativeBCSCAlertsSystemCheck } from '@/services/system-checks/InformativeBCSCAlertsSystemCheck'
import { SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCSCAlertEvent } from '@/store'

describe('InformativeBCSCAlertsSystemCheck', () => {
  let mockUtils: SystemCheckUtils
  let emitAlert: jest.Mock

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
  })

  describe('runCheck', () => {
    it('should return true when there is no alert reasoning', async () => {
      const check = new InformativeBCSCAlertsSystemCheck(undefined, emitAlert, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(true)
    })

    it('should return false when there is alert reasoning', async () => {
      const alertReasoning: BCSCAlertEvent = { reason: BCSCReason.Renew } as any
      const check = new InformativeBCSCAlertsSystemCheck(alertReasoning, emitAlert, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })
  })

  describe('onFail', () => {
    it('should emit CARD_STATUS_UPDATED for Renew', () => {
      const alertReasoning: BCSCAlertEvent = { reason: BCSCReason.Renew } as any
      const check = new InformativeBCSCAlertsSystemCheck(alertReasoning, emitAlert, mockUtils)

      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith(
        'BCSC.AccountUpdated.Title',
        'BCSC.AccountUpdated.Message',
        expect.objectContaining({
          event: AppEventCode.CARD_STATUS_UPDATED,
          actions: [
            {
              onPress: expect.any(Function),
              text: 'BCSC.AccountUpdated.Button',
              style: 'cancel',
            },
          ],
        })
      )
    })

    it('should emit CARD_TYPE_CHANGED for Replace', () => {
      const alertReasoning: BCSCAlertEvent = { reason: BCSCReason.Replace } as any
      const check = new InformativeBCSCAlertsSystemCheck(alertReasoning, emitAlert, mockUtils)

      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith(
        'BCSC.AccountUpdated.Title',
        'BCSC.AccountUpdated.Message',
        expect.objectContaining({
          event: AppEventCode.CARD_TYPE_CHANGED,
          actions: [
            {
              onPress: expect.any(Function),
              text: 'BCSC.AccountUpdated.Button',
              style: 'cancel',
            },
          ],
        })
      )
    })

    it('should emit GENERAL for other reasons', () => {
      const alertReasoning: BCSCAlertEvent = { reason: BCSCReason.ApprovedByAgent } as any
      const check = new InformativeBCSCAlertsSystemCheck(alertReasoning, emitAlert, mockUtils)

      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith(
        'BCSC.AccountUpdated.Title',
        'BCSC.AccountUpdated.Message',
        expect.objectContaining({
          event: AppEventCode.GENERAL,
          actions: [
            {
              onPress: expect.any(Function),
              text: 'BCSC.AccountUpdated.Button',
              style: 'cancel',
            },
          ],
        })
      )
    })
  })

  describe('onSuccess', () => {
    it('should do nothing', () => {
      const check = new InformativeBCSCAlertsSystemCheck(undefined, emitAlert, mockUtils)

      check.onSuccess()

      expect(emitAlert).not.toHaveBeenCalled()
      expect(mockUtils.dispatch).not.toHaveBeenCalled()
    })
  })
})

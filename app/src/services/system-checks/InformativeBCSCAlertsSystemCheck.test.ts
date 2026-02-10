import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { AppEventCode } from '@/events/appEventCode'
import { InformativeBCSCAlertsSystemCheck } from '@/services/system-checks/InformativeBCSCAlertsSystemCheck'
import { SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction, BCSCAlertEvent } from '@/store'

describe('InformativeBCSCAlertsSystemCheck', () => {
  let mockUtils: SystemCheckUtils
  let emitAlert: jest.Mock

  const createAlertReasoning = (reason: BCSCReason): BCSCAlertEvent => ({
    event: 'StatusNotification',
    reason,
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
  })

  describe('runCheck', () => {
    it('should return true when there is no alert reasoning', async () => {
      const check = new InformativeBCSCAlertsSystemCheck(undefined, emitAlert, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(true)
    })

    it('should return false when there is alert reasoning', async () => {
      const check = new InformativeBCSCAlertsSystemCheck(createAlertReasoning(BCSCReason.Renew), emitAlert, mockUtils)

      const result = await check.runCheck()

      expect(result).toBe(false)
    })
  })

  describe('onFail', () => {
    it('should emit CARD_STATUS_UPDATED for Renew', () => {
      const check = new InformativeBCSCAlertsSystemCheck(createAlertReasoning(BCSCReason.Renew), emitAlert, mockUtils)

      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith('BCSC.AccountUpdated.Title', 'BCSC.AccountUpdated.Message', {
        event: AppEventCode.CARD_STATUS_UPDATED,
        actions: [
          {
            text: 'BCSC.AccountUpdated.Button',
            style: 'cancel',
            onPress: expect.any(Function),
          },
        ],
      })

      // Verify the onPress callback clears alert reasoning
      const alertOptions = emitAlert.mock.calls[0][2]
      alertOptions.actions[0].onPress()
      expect(mockUtils.dispatch).toHaveBeenCalledWith({ type: BCDispatchAction.ALERT_REASONING, payload: undefined })
    })

    it('should emit CARD_TYPE_CHANGED for Replace', () => {
      const check = new InformativeBCSCAlertsSystemCheck(createAlertReasoning(BCSCReason.Replace), emitAlert, mockUtils)

      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith('BCSC.AccountUpdated.Title', 'BCSC.AccountUpdated.Message', {
        event: AppEventCode.CARD_TYPE_CHANGED,
        actions: [
          {
            text: 'BCSC.AccountUpdated.Button',
            style: 'cancel',
            onPress: expect.any(Function),
          },
        ],
      })

      // Verify the onPress callback clears alert reasoning
      const alertOptions = emitAlert.mock.calls[0][2]
      alertOptions.actions[0].onPress()
      expect(mockUtils.dispatch).toHaveBeenCalledWith({ type: BCDispatchAction.ALERT_REASONING, payload: undefined })
    })

    it('should emit GENERAL for other reasons', () => {
      const check = new InformativeBCSCAlertsSystemCheck(
        createAlertReasoning(BCSCReason.ApprovedByAgent),
        emitAlert,
        mockUtils
      )

      check.onFail()

      expect(emitAlert).toHaveBeenCalledWith('BCSC.AccountUpdated.Title', 'BCSC.AccountUpdated.Message', {
        event: AppEventCode.GENERAL,
        actions: [
          {
            text: 'BCSC.AccountUpdated.Button',
            style: 'cancel',
            onPress: expect.any(Function),
          },
        ],
      })

      // Verify the onPress callback clears alert reasoning
      const alertOptions = emitAlert.mock.calls[0][2]
      alertOptions.actions[0].onPress()
      expect(mockUtils.dispatch).toHaveBeenCalledWith({ type: BCDispatchAction.ALERT_REASONING, payload: undefined })
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

import { PendingVerificationRecoverySystemCheck } from '@/services/system-checks/PendingVerificationRecoverySystemCheck'
import { SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'

const makeUtils = (): SystemCheckUtils => ({
  dispatch: jest.fn(),
  translation: jest.fn() as any,
  logger: { error: jest.fn() } as any,
})

describe('PendingVerificationRecoverySystemCheck', () => {
  describe('runCheck', () => {
    it('returns true when the device code exchange reports verified', async () => {
      const checkVerificationStatus = jest.fn().mockResolvedValue(true)
      const check = new PendingVerificationRecoverySystemCheck(checkVerificationStatus, makeUtils())

      await expect(check.runCheck()).resolves.toBe(true)
    })

    it('returns false when the device code exchange reports pending', async () => {
      const checkVerificationStatus = jest.fn().mockResolvedValue(false)
      const check = new PendingVerificationRecoverySystemCheck(checkVerificationStatus, makeUtils())

      await expect(check.runCheck()).resolves.toBe(false)
    })

    it('treats an exchange failure as unverified rather than propagating it', async () => {
      const checkVerificationStatus = jest.fn().mockRejectedValue(new Error('exchange failed'))
      const check = new PendingVerificationRecoverySystemCheck(checkVerificationStatus, makeUtils())

      await expect(check.runCheck()).resolves.toBe(false)
    })
  })

  describe('onSuccess', () => {
    it('sets the verification request status to verified, same as the backcheck check', () => {
      const utils = makeUtils()
      const check = new PendingVerificationRecoverySystemCheck(jest.fn(), utils)

      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: ['verified'],
      })
    })

    it('clears the verification request status message', () => {
      const utils = makeUtils()
      const check = new PendingVerificationRecoverySystemCheck(jest.fn(), utils)

      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
        payload: [undefined],
      })
    })
  })

  describe('onFail', () => {
    it('does not dispatch anything — the in-person/live-call screens surface their own messaging', () => {
      const utils = makeUtils()
      const check = new PendingVerificationRecoverySystemCheck(jest.fn(), utils)

      check.onFail()

      expect(utils.dispatch).not.toHaveBeenCalled()
    })
  })
})

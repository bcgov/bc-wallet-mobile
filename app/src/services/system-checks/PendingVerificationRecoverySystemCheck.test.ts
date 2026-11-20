import { reportSessionWritesAs } from '@/bcsc-theme/storage/testing'
import { PendingVerificationRecoverySystemCheck } from '@/services/system-checks/PendingVerificationRecoverySystemCheck'
import { SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'

// The checks write to the store now; `dispatch` is only where those writes are reported, in the old action shape
const makeUtils = (): SystemCheckUtils & { dispatch: jest.Mock } => {
  const dispatch = jest.fn()
  // Status writes go to the session slice; reported here in the old action's shape
  reportSessionWritesAs(dispatch)
  return {
    dispatch,
    translation: jest.fn() as any,
    logger: { error: jest.fn() } as any,
  } as SystemCheckUtils & { dispatch: jest.Mock }
}

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
    it('records a verified status through the status-received action, same as the backcheck check', () => {
      const utils = makeUtils()
      const check = new PendingVerificationRecoverySystemCheck(jest.fn(), utils)

      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledTimes(1)
      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
        payload: [{ status: 'verified' }],
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

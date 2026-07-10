import { VerificationRequestStatusSystemCheck } from '@/services/system-checks/VerificationRequestStatusSystemCheck'
import { SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'

const makeUtils = (): SystemCheckUtils => ({
  dispatch: jest.fn(),
  translation: jest.fn() as any,
  logger: {} as any,
})

const makeStatus = (status: string, status_message?: string) => jest.fn().mockResolvedValue({ status, status_message })

describe('VerificationRequestStatusSystemCheck', () => {
  describe('runCheck', () => {
    it('returns false when status is pending', async () => {
      const check = new VerificationRequestStatusSystemCheck(makeStatus('pending'), makeUtils())

      await expect(check.runCheck()).resolves.toBe(false)
    })

    it('returns false when status is cancelled', async () => {
      const check = new VerificationRequestStatusSystemCheck(makeStatus('cancelled'), makeUtils())

      await expect(check.runCheck()).resolves.toBe(false)
    })

    it('returns true when status is verified', async () => {
      const check = new VerificationRequestStatusSystemCheck(makeStatus('verified'), makeUtils())

      await expect(check.runCheck()).resolves.toBe(true)
    })

    it('returns true for any other status value', async () => {
      const check = new VerificationRequestStatusSystemCheck(makeStatus('unknown'), makeUtils())

      await expect(check.runCheck()).resolves.toBe(true)
    })
  })

  describe('onFail', () => {
    it('dispatches the captured pending status', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('pending', 'Waiting for review'), utils)

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: ['pending'],
      })
    })

    it('dispatches the captured cancelled status', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('cancelled', 'Review was cancelled'), utils)

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: ['cancelled'],
      })
    })

    it('dispatches the captured status_message', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('pending', 'Some message'), utils)

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
        payload: ['Some message'],
      })
    })

    it('dispatches undefined status_message when none is returned', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('pending'), utils)

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
        payload: [undefined],
      })
    })

    it('dispatches null status when called before runCheck', () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('pending'), utils)

      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: [null],
      })
    })
  })

  describe('onSuccess', () => {
    it('clears the verification request status', () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('verified'), utils)

      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: [undefined],
      })
    })

    it('clears the verification request status message', () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('verified'), utils)

      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
        payload: [undefined],
      })
    })
  })
})

import { AppEventCode } from '@/events/appEventCode'
import { VerificationRequestStatusSystemCheck } from '@/services/system-checks/VerificationRequestStatusSystemCheck'
import { runSystemChecks, SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'
import { mockAppError } from '@mocks/helpers/error'

const makeUtils = (): SystemCheckUtils => ({
  dispatch: jest.fn(),
  translation: jest.fn() as any,
  logger: { warn: jest.fn(), error: jest.fn() } as any,
})

const makeStatus = (status: string, status_message?: string) => jest.fn().mockResolvedValue({ status, status_message })
const makeCheckDeviceCodeStatus = () => jest.fn().mockResolvedValue(undefined)

describe('VerificationRequestStatusSystemCheck', () => {
  describe('runCheck', () => {
    it('returns false when status is pending', async () => {
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus('pending'),
        makeCheckDeviceCodeStatus(),
        makeUtils()
      )

      await expect(check.runCheck()).resolves.toBe(false)
    })

    it('returns false when status is cancelled', async () => {
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus('cancelled'),
        makeCheckDeviceCodeStatus(),
        makeUtils()
      )

      await expect(check.runCheck()).resolves.toBe(false)
    })

    it('does not exchange the device code when status is pending or cancelled', async () => {
      const checkDeviceCodeStatus = makeCheckDeviceCodeStatus()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('pending'), checkDeviceCodeStatus, makeUtils())

      await check.runCheck()

      expect(checkDeviceCodeStatus).not.toHaveBeenCalled()
    })

    it('returns true when status is verified', async () => {
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus('verified'),
        makeCheckDeviceCodeStatus(),
        makeUtils()
      )

      await expect(check.runCheck()).resolves.toBe(true)
    })

    it('exchanges the device code for real tokens when status is verified', async () => {
      const checkDeviceCodeStatus = makeCheckDeviceCodeStatus()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('verified'), checkDeviceCodeStatus, makeUtils())

      await check.runCheck()

      expect(checkDeviceCodeStatus).toHaveBeenCalledTimes(1)
    })

    it('propagates a device code exchange failure instead of reporting success', async () => {
      const checkDeviceCodeStatus = jest.fn().mockRejectedValue(new Error('token exchange failed'))
      const check = new VerificationRequestStatusSystemCheck(makeStatus('verified'), checkDeviceCodeStatus, makeUtils())

      await expect(check.runCheck()).rejects.toThrow('token exchange failed')
    })

    it.each([AppEventCode.AUTHORIZATION_PENDING, AppEventCode.VERIFY_NOT_COMPLETE])(
      'returns false for an unrecognised status when the exchange rejects with %s',
      async (code) => {
        const checkDeviceCodeStatus = jest.fn().mockRejectedValue(mockAppError(code))
        const utils = makeUtils()
        const check = new VerificationRequestStatusSystemCheck(makeStatus('expired'), checkDeviceCodeStatus, utils)

        await expect(check.runCheck()).resolves.toBe(false)
        expect(checkDeviceCodeStatus).toHaveBeenCalledTimes(1)
        expect(utils.logger.warn).toHaveBeenCalledWith(
          expect.stringContaining("Unrecognised verification status 'expired'")
        )
      }
    )

    it('returns true for an unrecognised status when the exchange resolves', async () => {
      const checkDeviceCodeStatus = makeCheckDeviceCodeStatus()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('expired'), checkDeviceCodeStatus, makeUtils())

      await expect(check.runCheck()).resolves.toBe(true)
      expect(checkDeviceCodeStatus).toHaveBeenCalledTimes(1)
    })

    it('rejects for an unrecognised status when the exchange fails with ALREADY_VERIFIED', async () => {
      const error = mockAppError(AppEventCode.ALREADY_VERIFIED)
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus('expired'),
        jest.fn().mockRejectedValue(error),
        makeUtils()
      )

      await expect(check.runCheck()).rejects.toBe(error)
    })
  })

  describe('onFail', () => {
    it('dispatches the captured pending status', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus('pending', 'Waiting for review'),
        makeCheckDeviceCodeStatus(),
        utils
      )

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: ['pending'],
      })
    })

    it('dispatches the captured cancelled status', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus('cancelled', 'Review was cancelled'),
        makeCheckDeviceCodeStatus(),
        utils
      )

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: ['cancelled'],
      })
    })

    it('dispatches the captured status_message', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus('pending', 'Some message'),
        makeCheckDeviceCodeStatus(),
        utils
      )

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
        payload: ['Some message'],
      })
    })

    it('dispatches undefined status_message when none is returned', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('pending'), makeCheckDeviceCodeStatus(), utils)

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
        payload: [undefined],
      })
    })

    it('leaves the stored status untouched after an unrecognised status', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus('expired'),
        jest.fn().mockRejectedValue(mockAppError(AppEventCode.AUTHORIZATION_PENDING)),
        utils
      )

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).not.toHaveBeenCalled()
    })
  })

  describe('onSuccess', () => {
    it('sets the verification request status to verified, same as the push notification path', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('verified'), makeCheckDeviceCodeStatus(), utils)

      await check.runCheck()
      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: ['verified'],
      })
    })

    it('sets verified when the exchange confirmed an unrecognised status', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('expired'), makeCheckDeviceCodeStatus(), utils)

      await check.runCheck()
      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS,
        payload: ['verified'],
      })
    })

    it('clears the verification request status message', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('verified'), makeCheckDeviceCodeStatus(), utils)

      await check.runCheck()
      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_SECURE_VERIFICATION_REQUEST_STATUS_MESSAGE,
        payload: [undefined],
      })
    })
  })
})

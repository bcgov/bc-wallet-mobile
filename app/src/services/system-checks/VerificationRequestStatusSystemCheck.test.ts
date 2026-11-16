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
    it.each([
      ['pending', 'Waiting for review'],
      ['cancelled', 'Review was cancelled'],
      ['pending', undefined],
    ])('dispatches one event with the captured %s status and message %s', async (status, message) => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(
        makeStatus(status, message),
        makeCheckDeviceCodeStatus(),
        utils
      )

      await check.runCheck()
      check.onFail()

      expect(utils.dispatch).toHaveBeenCalledTimes(1)
      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
        payload: [{ status, status_message: message }],
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
    it('dispatches one verified event, same as the push notification path', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('verified'), makeCheckDeviceCodeStatus(), utils)

      await check.runCheck()
      check.onSuccess()

      expect(utils.dispatch).toHaveBeenCalledTimes(1)
      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
        payload: [{ status: 'verified' }],
      })
    })

    it('dispatches verified when the exchange confirmed an unrecognised status', async () => {
      const utils = makeUtils()
      const check = new VerificationRequestStatusSystemCheck(makeStatus('expired'), makeCheckDeviceCodeStatus(), utils)

      await expect(runSystemChecks([check], utils.logger)).resolves.toEqual([true])

      expect(utils.dispatch).toHaveBeenCalledTimes(1)
      expect(utils.dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.VERIFICATION_STATUS_RECEIVED,
        payload: [{ status: 'verified' }],
      })
    })
  })
})

import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { VerificationSessionExpiredSystemCheck } from '@/services/system-checks/VerificationSessionExpiredSystemCheck'
import { MockLogger } from '@bifold/core'

const makeUtils = () => ({
  dispatch: jest.fn(),
  translation: jest.fn() as any,
  logger: new MockLogger(),
})

describe('VerificationSessionExpiredSystemCheck', () => {
  const now = new Date('2026-06-16T00:00:00.000Z')

  describe('runCheck', () => {
    it('returns true (and skips the expiry lookup) when the user is already verified', async () => {
      const getExpiry = jest.fn().mockResolvedValue(new Date(now.getTime() - 1000))
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, true, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(true)
      expect(getExpiry).not.toHaveBeenCalled()
    })

    it('returns true when there is no pending device_code', async () => {
      const getExpiry = jest.fn().mockResolvedValue(null)
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, false, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(true)
    })

    it('returns true when the device_code has not yet expired', async () => {
      const getExpiry = jest.fn().mockResolvedValue(new Date(now.getTime() + 60_000))
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, false, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(true)
    })

    it('returns false when an unverified user holds an expired device_code', async () => {
      const getExpiry = jest.fn().mockResolvedValue(new Date(now.getTime() - 60_000))
      const check = new VerificationSessionExpiredSystemCheck(getExpiry, false, {} as any, makeUtils(), now)

      await expect(check.runCheck()).resolves.toBe(false)
    })
  })

  describe('onFail', () => {
    it('navigates to the VerificationSessionExpired modal', () => {
      const navigate = jest.fn()
      const check = new VerificationSessionExpiredSystemCheck(
        jest.fn().mockResolvedValue(null),
        false,
        { navigate } as any,
        makeUtils(),
        now
      )

      check.onFail()

      expect(navigate).toHaveBeenCalledWith(BCSCModals.VerificationSessionExpired)
    })
  })
})

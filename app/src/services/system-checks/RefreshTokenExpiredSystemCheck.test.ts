import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { RefreshTokenExpiredSystemCheck } from '@/services/system-checks/RefreshTokenExpiredSystemCheck'
import { MockLogger } from '@bifold/core'

const makeUtils = () => ({
  dispatch: jest.fn(),
  translation: jest.fn() as any,
  logger: new MockLogger(),
})

describe('RefreshTokenExpiredSystemCheck', () => {
  describe('runCheck', () => {
    it('returns true when the refresh token is not expired', () => {
      const check = new RefreshTokenExpiredSystemCheck(false, {} as any, makeUtils())

      expect(check.runCheck()).toBe(true)
    })

    it('returns false when the refresh token is expired', () => {
      const check = new RefreshTokenExpiredSystemCheck(true, {} as any, makeUtils())

      expect(check.runCheck()).toBe(false)
    })
  })

  describe('onFail', () => {
    it('navigates to ReverifyAccount with isExpired: true and dispatches nothing', () => {
      const navigate = jest.fn()
      const utils = makeUtils()
      const check = new RefreshTokenExpiredSystemCheck(true, { navigate } as any, utils)

      check.onFail()

      expect(navigate).toHaveBeenCalledWith(BCSCScreens.ReverifyAccount, { isExpired: true })
      expect(utils.dispatch).not.toHaveBeenCalled()
    })
  })
})

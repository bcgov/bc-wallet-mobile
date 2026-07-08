import { AccountExpirySystemCheck } from '@/services/system-checks/AccountExpirySystemCheck'
import { SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'

const DAY_IN_MS = 24 * 60 * 60 * 1000

describe('AccountExpirySystemCheck', () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('1970-01-01'))
  })

  describe('runCheck', () => {
    it('should return false if the account is expired (yesterday)', () => {
      const expiredDate = new Date(Date.now() - DAY_IN_MS)

      const check = new AccountExpirySystemCheck(expiredDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(false)
    })

    it('should return false if the account expires today', () => {
      const expiredDate = new Date()

      const check = new AccountExpirySystemCheck(expiredDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(false)
    })

    it('should return true if the account is not expired (tomorrow)', () => {
      const futureDate = new Date(Date.now() + DAY_IN_MS)

      const check = new AccountExpirySystemCheck(futureDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(true)
    })
  })

  describe('onFail', () => {
    it('should dispatch SET_ACCOUNT_EXPIRY_NOTIFICATION with true', () => {
      const mockDispatch = jest.fn()
      const check = new AccountExpirySystemCheck(new Date(Date.now() - DAY_IN_MS), {
        dispatch: mockDispatch,
      } as unknown as SystemCheckUtils)

      check.onFail()

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.SET_ACCOUNT_EXPIRY_NOTIFICATION,
        payload: [true],
      })
    })
  })

  describe('onSuccess', () => {
    it('should dispatch SET_ACCOUNT_EXPIRY_NOTIFICATION with false', () => {
      const mockDispatch = jest.fn()
      const check = new AccountExpirySystemCheck(new Date(Date.now() + DAY_IN_MS), {
        dispatch: mockDispatch,
      } as unknown as SystemCheckUtils)

      check.onSuccess()

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.SET_ACCOUNT_EXPIRY_NOTIFICATION,
        payload: [false],
      })
    })
  })
})

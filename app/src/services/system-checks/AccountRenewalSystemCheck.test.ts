import { AccountRenewalSystemCheck } from '@/services/system-checks/AccountRenewalSystemCheck'
import { SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'

const DAY_IN_MS = 24 * 60 * 60 * 1000

describe('AccountRenewalSystemCheck', () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('1970-01-01'))
  })
  describe('runCheck', () => {
    it('should return true if the account is expired (yesterday)', () => {
      const expiredDate = new Date(Date.now() - DAY_IN_MS) // Yesterday

      const check = new AccountRenewalSystemCheck(expiredDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(true)
    })

    it('should return true if the account is expired (today)', () => {
      const expiredDate = new Date() // Today

      const check = new AccountRenewalSystemCheck(expiredDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(true)
    })

    it('should return false if the account is expiring within the warning period (30 days)', () => {
      const expiringSoonDate = new Date(Date.now() + 30 * DAY_IN_MS)

      const check = new AccountRenewalSystemCheck(expiringSoonDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(false)
    })

    it('should return true if the account is not expiring soon (31 days)', () => {
      const validDate = new Date(Date.now() + 31 * DAY_IN_MS)

      const check = new AccountRenewalSystemCheck(validDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(true)
    })
  })

  describe('onFail', () => {
    it('should dispatch a warning banner if the account is expiring soon', () => {
      const date = new Date(Date.now() + 30 * DAY_IN_MS)

      const check = new AccountRenewalSystemCheck(date, {
        dispatch: jest.fn(),
        translation: jest.fn().mockReturnValue('Expires in 30 days') as any,
        logger: {} as any,
      })

      check.onFail()

      expect(check['utils'].dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.SET_CARD_RENEWAL_NOTIFICATION,
        payload: [true],
      })
    })

    it.todo('should not dispatch a banner if the account is already expired')
  })
})

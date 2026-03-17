import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { AccountExpiryWarningBannerSystemCheck } from '@/services/system-checks/AccountExpiryWarningBannerSystemCheck'
import { SystemCheckUtils } from '@/services/system-checks/system-checks'
import { BCDispatchAction } from '@/store'

const DAY_IN_MS = 24 * 60 * 60 * 1000

describe('AccountExpiryWarningBannerSystemCheck', () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('1970-01-01'))
  })
  describe('runCheck', () => {
    it('should return true if the account is expired (yesterday)', () => {
      const expiredDate = new Date(Date.now() - DAY_IN_MS) // Yesterday

      const check = new AccountExpiryWarningBannerSystemCheck(expiredDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(true)
    })

    it('should return true if the account is expired (today)', () => {
      const expiredDate = new Date() // Today

      const check = new AccountExpiryWarningBannerSystemCheck(expiredDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(true)
    })

    it('should return false if the account is expiring within the warning period (30 days)', () => {
      const expiringSoonDate = new Date(Date.now() + 30 * DAY_IN_MS)

      const check = new AccountExpiryWarningBannerSystemCheck(expiringSoonDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(false)
    })

    it('should return true if the account is not expiring soon (31 days)', () => {
      const validDate = new Date(Date.now() + 31 * DAY_IN_MS)

      const check = new AccountExpiryWarningBannerSystemCheck(validDate, {} as SystemCheckUtils)

      expect(check.runCheck()).toBe(true)
    })
  })

  describe('onFail', () => {
    it('should dispatch a warning banner if the account is expiring soon', () => {
      const date = new Date(Date.now() + 30 * DAY_IN_MS)

      const check = new AccountExpiryWarningBannerSystemCheck(date, {
        dispatch: jest.fn(),
        translation: jest.fn().mockReturnValue('Expires in 30 days') as any,
        logger: {} as any,
      })

      check.onFail()

      expect(check['utils'].dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.ADD_BANNER_MESSAGE,
        payload: [
          {
            id: BCSCBanner.ACCOUNT_EXPIRING_SOON,
            title: 'Expires in 30 days',
            description: 'Expires in 30 days',
            type: 'warning',
            variant: 'summary',
            dismissible: false,
          },
        ],
      })
    })

    it.todo('should not dispatch a banner if the account is already expired')
  })

  describe('onSuccess', () => {
    it('should dispatch an action to remove the account expiring soon banner', () => {
      const date = new Date(Date.now() + 31 * DAY_IN_MS)

      const check = new AccountExpiryWarningBannerSystemCheck(date, {
        dispatch: jest.fn(),
        translation: jest.fn() as any,
        logger: {} as any,
      })

      check.onSuccess()

      expect(check['utils'].dispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.REMOVE_BANNER_MESSAGE,
        payload: [BCSCBanner.ACCOUNT_EXPIRING_SOON],
      })
    })
  })
})

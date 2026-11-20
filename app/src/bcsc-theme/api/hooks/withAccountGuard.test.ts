import { AccountNotFoundError, withAccount } from '@/bcsc-theme/api/hooks/withAccountGuard'
import { nativeAccount, seedAccount } from '@/bcsc-theme/storage/testing'
import { AppError, isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'

jest.mock('react-native-bcsc-core', () => ({
  isAccountRegistered: (account: { clientID?: string } | null) => Boolean(account?.clientID),
}))

describe('withAccount', () => {
  const fn = jest.fn()
  const trackSpy = jest.spyOn(AppError.prototype, 'track')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws a plain AccountNotFoundError, without running the wrapped function, when there is no account', async () => {
    seedAccount(null)

    const error = (await withAccount(fn).catch((e) => e)) as AccountNotFoundError

    expect(error).toBeInstanceOf(AccountNotFoundError)
    expect(error).toBeInstanceOf(Error)
    expect(isAppError(error)).toBe(false)
    expect(error.message).toBe('No account found. Please register first.')
    expect(fn).not.toHaveBeenCalled()
  })

  it('throws ACCOUNT_NOT_REGISTERED when the account is only a temporary one', async () => {
    seedAccount(nativeAccount({ clientID: '' }))

    const error = (await withAccount(fn).catch((e) => e)) as AppError

    expect(isAppError(error, AppEventCode.ACCOUNT_NOT_REGISTERED)).toBe(true)
    expect(error.statusCode).toBe(2836)
    expect(error.message).toBe('No account found. Please register first.')
    expect(trackSpy).not.toHaveBeenCalled()
    expect(fn).not.toHaveBeenCalled()
  })

  it('runs the wrapped function with the account and returns its result', async () => {
    const account = nativeAccount({ clientID: 'client-id' })
    seedAccount(account)
    fn.mockResolvedValue('result')

    await expect(withAccount(fn)).resolves.toBe('result')
    expect(fn).toHaveBeenCalledWith(account)
  })
})

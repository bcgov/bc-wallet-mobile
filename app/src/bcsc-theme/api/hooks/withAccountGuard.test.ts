import { withAccount } from '@/bcsc-theme/api/hooks/withAccountGuard'
import { AppError, isAppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { AppEventCode } from '@/events/appEventCode'
import { getAccount } from 'react-native-bcsc-core'

jest.mock('react-native-bcsc-core', () => ({
  getAccount: jest.fn(),
  isAccountRegistered: (account: { clientID?: string } | null) => Boolean(account?.clientID),
}))

describe('withAccount', () => {
  const fn = jest.fn()
  const trackSpy = jest.spyOn(AppError.prototype, 'track')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws ACCOUNT_NOT_FOUND, without running the wrapped function, when there is no account', async () => {
    jest.mocked(getAccount).mockResolvedValue(null)

    const error = (await withAccount(fn).catch((e) => e)) as AppError

    expect(isAppError(error, AppEventCode.ACCOUNT_NOT_FOUND)).toBe(true)
    expect(error.statusCode).toBe(ErrorRegistry.ACCOUNT_NOT_FOUND.statusCode)
    expect(error.message).toBe('No account found. Please register first.')
    expect(trackSpy).not.toHaveBeenCalled()
    expect(fn).not.toHaveBeenCalled()
  })

  it('throws ACCOUNT_NOT_REGISTERED when the account is only a temporary one', async () => {
    jest.mocked(getAccount).mockResolvedValue({ clientID: '' } as any)

    const error = (await withAccount(fn).catch((e) => e)) as AppError

    expect(isAppError(error, AppEventCode.ACCOUNT_NOT_REGISTERED)).toBe(true)
    expect(error.statusCode).toBe(2836)
    expect(error.message).toBe('No account found. Please register first.')
    expect(trackSpy).not.toHaveBeenCalled()
    expect(fn).not.toHaveBeenCalled()
  })

  it('runs the wrapped function with the account and returns its result', async () => {
    const account = { clientID: 'client-id' }
    jest.mocked(getAccount).mockResolvedValue(account as any)
    fn.mockResolvedValue('result')

    await expect(withAccount(fn)).resolves.toBe('result')
    expect(fn).toHaveBeenCalledWith(account)
  })

  it('propagates a getAccount rejection unchanged, as neither guard error', async () => {
    const nativeError = new Error('native read failed')
    jest.mocked(getAccount).mockRejectedValue(nativeError)

    const error = await withAccount(fn).catch((e) => e)

    expect(error).toBe(nativeError)
    expect(isAppError(error)).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })
})

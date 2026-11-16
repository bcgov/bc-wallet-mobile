import { AccountNotFoundError, withAccount } from '@/bcsc-theme/api/hooks/withAccountGuard'
import { AppError, isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { getAccount, getAccountReadStatus } from 'react-native-bcsc-core'

jest.mock('react-native-bcsc-core', () => ({
  getAccount: jest.fn(),
  getAccountReadStatus: jest.fn(),
  isAccountRegistered: (account: { clientID?: string } | null) => Boolean(account?.clientID),
}))

describe('withAccount', () => {
  const fn = jest.fn()
  const trackSpy = jest.spyOn(AppError.prototype, 'track')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws a plain AccountNotFoundError, without running the wrapped function, when there is no account', async () => {
    jest.mocked(getAccount).mockResolvedValue(null)
    jest.mocked(getAccountReadStatus).mockResolvedValue({ status: 'account_decode_failed', environment: 'PROD' })

    const error = (await withAccount(fn).catch((e) => e)) as AccountNotFoundError

    expect(error).toBeInstanceOf(AccountNotFoundError)
    expect(error).toBeInstanceOf(Error)
    expect(isAppError(error)).toBe(false)
    expect(error.message).toBe('No account found. Please register first.')
    expect(error.readContext).toMatchObject({
      account_read_status: 'account_decode_failed',
      account_read_environment: 'PROD',
    })
    expect(fn).not.toHaveBeenCalled()
  })

  it('still throws AccountNotFoundError when the read status lookup fails', async () => {
    jest.mocked(getAccount).mockResolvedValue(null)
    jest.mocked(getAccountReadStatus).mockRejectedValue(new Error('not linked'))

    const error = (await withAccount(fn).catch((e) => e)) as AccountNotFoundError

    expect(error).toBeInstanceOf(AccountNotFoundError)
    expect(error.readContext).toBeUndefined()
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
    // The read status explains only a null read, never a rejection
    expect(getAccountReadStatus).not.toHaveBeenCalled()
  })
})

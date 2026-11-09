import { getAccountReadContext } from '@/bcsc-theme/utils/account-read-status'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { getAccount, isAccountRegistered } from 'react-native-bcsc-core'

/**
 * Thrown by `withAccount` when there is no device account. Still a plain `Error` with the same message, so
 * existing callers behave the same; `readContext` says why the native read came back empty, for error reports.
 */
export class AccountNotFoundError extends Error {
  readonly readContext?: Record<string, unknown>

  constructor(readContext?: Record<string, unknown>) {
    super('No account found. Please register first.')
    this.name = 'AccountNotFoundError'
    this.readContext = readContext
  }
}

/**
 * This is a wrapper function to centralize checking for an account before executing a function.
 *
 * Throws an `AccountNotFoundError` when there is no device account, and an `ACCOUNT_NOT_REGISTERED` AppError when
 * the account is only a temporary one (empty client ID), so recovery can register it.
 *
 * @param fn Function that `withAccount` will wrap, which requires an account to be present.
 * @returns The executed function with the account passed as an argument.
 */
export const withAccount = async <T>(fn: (account: any) => Promise<T>): Promise<T> => {
  const account = await getAccount()

  if (!isAccountRegistered(account)) {
    if (account) {
      // Not tracked here: analytics record it only if an alert surfaces it
      throw new AppError('No account found. Please register first.', ErrorRegistry.ACCOUNT_NOT_REGISTERED, {
        track: false,
      })
    }

    // Only here, after getAccount returned null, is the read status meaningful
    throw new AccountNotFoundError(await getAccountReadContext())
  }

  return fn(account)
}

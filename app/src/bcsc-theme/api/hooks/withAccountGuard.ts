import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { getAccount, isAccountRegistered } from 'react-native-bcsc-core'

/**
 * This is a wrapper function to centralize checking for an account before executing a function.
 *
 * Throws a plain `Error` when there is no device account, and an `ACCOUNT_NOT_REGISTERED` AppError when
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

    throw new Error('No account found. Please register first.')
  }

  return fn(account)
}

import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { getAccount, isAccountRegistered } from 'react-native-bcsc-core'

const NO_ACCOUNT_MESSAGE = 'No account found. Please register first.'

/**
 * This is a wrapper function to centralize checking for an account before executing a function.
 *
 * Throws `ACCOUNT_NOT_FOUND` when there is no device account and `ACCOUNT_NOT_REGISTERED` when the
 * account is only a temporary one (empty client ID), so callers can tell the two apart.
 *
 * @param fn Function that `withAccount` will wrap, which requires an account to be present.
 * @returns The executed function with the account passed as an argument.
 */
export const withAccount = async <T>(fn: (account: any) => Promise<T>): Promise<T> => {
  const account = await getAccount()

  if (!isAccountRegistered(account)) {
    // Not tracked here: analytics record it only if an alert surfaces it
    throw new AppError(
      NO_ACCOUNT_MESSAGE,
      account ? ErrorRegistry.ACCOUNT_NOT_REGISTERED : ErrorRegistry.ACCOUNT_NOT_FOUND,
      {
        track: false,
      }
    )
  }

  return fn(account)
}

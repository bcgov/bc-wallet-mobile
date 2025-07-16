
import { getAccount } from 'react-native-bcsc-core'

/**
 * This is a wrapper function to centralize checking for an account before executing a function.
 * 
 * @param fn Function that `withAccount` will wrap, which requires an account to be present.
 * @returns The executed function with the account passed as an argument.
 */
export const withAccount = async <T>(fn: (account: any) => Promise<T>): Promise<T> => {
  const account = await getAccount();
  if (!account) {
    throw new Error('No account found. Please register first.')
  }

  return fn(account);
};

import { TOKENS, useServices } from '@bifold/core'
import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import useApi from '../api/hooks/useApi'
import { UserInfoResponseData } from '../api/hooks/useUserApi'
import useDataLoader from '../hooks/useDataLoader'

export interface BCSCAccount extends UserInfoResponseData {
  fullname_formatted: string
}

export interface BCSCAccountContextType {
  account: UserInfoResponseData | null
  picture: string | null
  isLoadingAccount: boolean
  // TODO (MD): should we include idToken?
}

export const BCSCAccountContext = createContext<BCSCAccountContextType | null>(null)

/**
 * Provides the BCSCAccountContext to child components, managing the loading of user account data.
 *
 * @param {PropsWithChildren} props - The props containing child components.
 * @returns {*} {JSX.Element} The BCSCAccountProvider component wrapping its children.
 */
export const BCSCAccountProvider = ({ children }: PropsWithChildren) => {
  const api = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const { data, load, isLoading } = useDataLoader(api.user.getUserMetadata, {
    onError: (error) => {
      logger.error('BCSCAccountProvider: Failed to load user metadata', { error })
    },
  })

  useEffect(() => {
    load()
  }, [load])

  const accountContextValue = useMemo(
    () => ({
      account: data?.user ?? null,
      picture: data?.picture ?? null,
      isLoadingAccount: isLoading && !data,
    }),
    [data, isLoading]
  )

  return <BCSCAccountContext.Provider value={accountContextValue}>{children}</BCSCAccountContext.Provider>
}

/**
 * Hook to access the BCSC account context.
 *
 * @returns {{ account: BCSCAccount }} The account data and loading state.
 */
export const useAccount = () => {
  const context = useContext(BCSCAccountContext)

  if (!context) {
    throw new Error('useAccount must be used within a BCSCAccountProvider')
  }

  if (!context.account || context.isLoadingAccount) {
    throw new Error('account is still loading')
  }

  return {
    ...context.account,
    fullname_formatted: `${context.account.family_name}, ${context.account.given_name}`,
    picture: context.picture,
  }
}

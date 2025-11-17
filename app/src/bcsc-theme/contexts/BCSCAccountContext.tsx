import { TOKENS, useServices } from '@bifold/core'
import moment from 'moment'
import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import useApi from '../api/hooks/useApi'
import { UserInfoResponseData } from '../api/hooks/useUserApi'
import useDataLoader from '../hooks/useDataLoader'

export interface BCSCAccount extends Omit<UserInfoResponseData, 'picture'> {
  picture_uri: string | null
  fullname_formatted: string // Brule, Steve
  account_expiration_date: Date // equivalent to card_expiry but as Date
}

export interface BCSCAccountContextType {
  account: BCSCAccount | null
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
      account: data
        ? {
            ...data.user,
            picture_uri: data.picture ?? null,
            fullname_formatted: `${data.user.family_name}, ${data?.user.given_name}`,
            account_expiration_date: moment(data.user.card_expiry, 'MMMM D, YYYY').toDate(),
          }
        : null,
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

  if (context.isLoadingAccount) {
    throw new Error('userAccount: account is still loading')
  }

  if (!context.account) {
    throw new Error('useAccount: account is null')
  }

  return context.account
}

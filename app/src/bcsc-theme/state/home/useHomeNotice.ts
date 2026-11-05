import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'
import { HomeNotice } from './home-notice'
import { selectHomeNotice } from './selectors'

/**
 * The notice Home shows, re-derived on store or account change and never stored.
 * Must be used inside BCSCAccountProvider.
 */
export const useHomeNotice = (): HomeNotice => {
  const [store] = useStore<BCState>()
  const { account } = useAccount()

  return useMemo(() => selectHomeNotice(store, account, new Date()), [store, account])
}

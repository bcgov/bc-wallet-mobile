import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useBCSCStore } from '@/bcsc-theme/storage'
import { useMemo } from 'react'
import { HomeNotice } from './home-notice'
import { selectHomeNotice } from './selectors'

/**
 * The notice Home shows, re-derived on store or account change and never stored.
 * Must be used inside BCSCAccountProvider.
 */
export const useHomeNotice = (): HomeNotice => {
  const store = useBCSCStore((s) => s)
  const { account } = useAccount()

  return useMemo(() => selectHomeNotice(store, account, new Date()), [store, account])
}

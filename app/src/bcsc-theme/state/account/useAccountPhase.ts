import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useBCSCStore } from '@/bcsc-theme/storage'
import { useMemo } from 'react'
import { AccountPhase } from './account-phase'
import { selectAccountPhase } from './selectors'

/**
 * The card's expiry phase, re-derived on store or account change (not at day rollover) and never stored.
 * Must be used inside BCSCAccountProvider.
 */
export const useAccountPhase = (): AccountPhase => {
  const store = useBCSCStore((s) => s)
  const { account } = useAccount()

  return useMemo(() => selectAccountPhase(store, account, new Date()), [store, account])
}

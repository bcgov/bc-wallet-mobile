import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { selectAccountPhase } from '@/bcsc-theme/selectors/account'
import { AccountPhase } from '@/bcsc-theme/utils/account-phase'
import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'

/**
 * The card's expiry phase, re-derived on store or account change (not at day rollover) and never stored.
 * Must be used inside BCSCAccountProvider.
 */
export const useAccountPhase = (): AccountPhase => {
  const [store] = useStore<BCState>()
  const { account } = useAccount()

  return useMemo(() => selectAccountPhase(store, account, new Date()), [store, account])
}

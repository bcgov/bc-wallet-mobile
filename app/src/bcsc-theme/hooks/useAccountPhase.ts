import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { selectAccountPhase } from '@/bcsc-theme/selectors/account'
import { AccountPhase, daysUntil } from '@/bcsc-theme/utils/account-phase'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useMemo } from 'react'

// Module-level so many callers log once per change; keyed by logger so each container (and test) starts fresh.
const lastLoggedPhase = new WeakMap<object, string>()

/**
 * The card's expiry phase, re-derived on store or account change (not at day rollover) and never stored.
 * Logs one info line per phase change. Must be used inside BCSCAccountProvider.
 */
export const useAccountPhase = (): AccountPhase => {
  const [store] = useStore<BCState>()
  const { account } = useAccount()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const accountPhase = useMemo(() => selectAccountPhase(store, account, new Date()), [store, account])

  useEffect(() => {
    if (lastLoggedPhase.get(logger) === accountPhase.phase) {
      return
    }
    lastLoggedPhase.set(logger, accountPhase.phase)

    const expiresAt = 'expiresAt' in accountPhase ? accountPhase.expiresAt : undefined
    const detail = expiresAt ? `, ${daysUntil(expiresAt, new Date())} days remaining` : ''
    logger.info(`[useAccountPhase] Card expiry phase: ${accountPhase.phase}${detail}`)
  }, [logger, accountPhase])

  return accountPhase
}

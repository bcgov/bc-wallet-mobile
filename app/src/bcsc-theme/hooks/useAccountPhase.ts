import { useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { selectAccountPhase } from '@/bcsc-theme/selectors/account'
import { AccountPhase, daysUntil } from '@/bcsc-theme/utils/account-phase'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useEffect, useMemo } from 'react'

// Several components call this hook; keying on the logger keeps one line per change, not one per caller.
const lastLoggedPhase = new WeakMap<object, string>()

/**
 * The card's expiry phase, derived on every store or account change and never stored.
 * It is not refreshed when the day rolls over; it re-derives the next time the store or account changes.
 *
 * Logs one info line when the phase changes. Must be used inside BCSCAccountProvider.
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

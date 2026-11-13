import { BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useMemo } from 'react'
import { selectVerificationState } from './selectors'
import { VerificationState } from './verification-state'

/** The user's verification state, re-derived on store change and never stored. */
export const useVerificationState = (): VerificationState => {
  const [store] = useStore<BCState>()

  return useMemo(() => selectVerificationState(store), [store])
}

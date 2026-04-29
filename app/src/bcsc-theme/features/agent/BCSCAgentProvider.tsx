import { BCAgent } from '@/utils/bc-agent-modules'
import React, { createContext, PropsWithChildren, useContext, useMemo } from 'react'

import { AppError } from '@/errors'

import useAgentSetupViewModel from './useAgentSetupViewModel'

export interface BCSCAgentContextValue {
  agent: BCAgent | null
  loading: boolean
  error: AppError | null
  retry: () => void
}

const BCSCAgentContext = createContext<BCSCAgentContextValue | null>(null)

export const useBCSCAgent = (): BCSCAgentContextValue => {
  const ctx = useContext(BCSCAgentContext)
  if (!ctx) {
    throw new Error('useBCSCAgent must be used within a BCSCAgentProvider')
  }
  return ctx
}

// Non-blocking and decoupled from Bifold's AgentProvider. Children always
// render; consumers inspect { agent, loading, error } via useBCSCAgent and
// decide what to show. Init failures are logged by the ViewModel — no modal,
// no fall-through to Bifold hooks. Screens that need the live agent reach
// for it through useBCSCAgent().agent rather than Bifold's useAgent().
const BCSCAgentProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { agent, status, error, retry } = useAgentSetupViewModel()

  const value = useMemo<BCSCAgentContextValue>(
    () => ({
      agent,
      loading: status === 'idle' || status === 'initializing',
      error,
      retry,
    }),
    [agent, status, error, retry]
  )

  return <BCSCAgentContext.Provider value={value}>{children}</BCSCAgentContext.Provider>
}

export default BCSCAgentProvider

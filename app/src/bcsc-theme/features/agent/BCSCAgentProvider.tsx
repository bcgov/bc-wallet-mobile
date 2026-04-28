import { AgentProvider } from '@bifold/core'
import { Agent } from '@credo-ts/core'
import React, { createContext, PropsWithChildren, useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AppError } from '@/errors'

import { LoadingScreen } from '../../contexts/BCSCLoadingContext'

import useAgentSetupViewModel, { AgentSetupStatus } from './useAgentSetupViewModel'

export interface BCSCAgentContextValue {
  agent: Agent | null
  status: AgentSetupStatus
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

// Non-blocking on error: init failures are logged by the ViewModel but we do
// not surface a modal — children render inside the BCSC context (so they can
// inspect status/error and react), but Bifold's AgentProvider is skipped on
// error since it requires a live agent. Downstream credential features will
// surface their own errors when invoked.
const BCSCAgentProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const { agent, status, error, retry } = useAgentSetupViewModel()

  const value = useMemo<BCSCAgentContextValue>(
    () => ({ agent, status, error, retry }),
    [agent, status, error, retry]
  )

  if (status === 'ready' && agent) {
    return (
      <BCSCAgentContext.Provider value={value}>
        <AgentProvider agent={agent}>{children}</AgentProvider>
      </BCSCAgentContext.Provider>
    )
  }

  if (status === 'error') {
    return <BCSCAgentContext.Provider value={value}>{children}</BCSCAgentContext.Provider>
  }

  return <LoadingScreen message={t('Init.InitializingAgent')} />
}

export default BCSCAgentProvider

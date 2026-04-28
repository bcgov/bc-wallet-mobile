import { AgentProvider } from '@bifold/core'
import React, { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'

import { LoadingScreen } from '../../contexts/BCSCLoadingContext'

import useAgentSetupViewModel from './useAgentSetupViewModel'

// Non-blocking on error: init failures are logged by the ViewModel but we do
// not surface a modal — children render without an active agent context, and
// downstream credential features will surface their own errors when invoked.
const BCSCAgentProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const { agent, status } = useAgentSetupViewModel()

  if (status === 'ready' && agent) {
    return <AgentProvider agent={agent}>{children}</AgentProvider>
  }

  if (status === 'error') {
    return <>{children}</>
  }

  return <LoadingScreen message={t('Init.InitializingAgent')} />
}

export default BCSCAgentProvider

import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AgentProvider, OpenIDCredentialRecordProvider } from '@bifold/core'
import React, { PropsWithChildren, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { LoadingScreen } from '../../contexts/BCSCLoadingContext'

import useAgentSetupViewModel from './useAgentSetupViewModel'

const BCSCAgentProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const { emitErrorModal } = useErrorAlert()
  const { agent, status, error, retry } = useAgentSetupViewModel()
  const lastErrorCodeRef = useRef<number | null>(null)

  useEffect(() => {
    if (status !== 'error' || !error) {
      lastErrorCodeRef.current = null
      return
    }

    if (lastErrorCodeRef.current === error.statusCode) {
      return
    }
    lastErrorCodeRef.current = error.statusCode

    const title = t(`Error.Title${error.statusCode}`)
    const description = t(`Error.Message${error.statusCode}`)
    emitErrorModal(title, description, error, {
      action: {
        text: t('Init.Retry'),
        onPress: retry,
      },
    })
  }, [status, error, emitErrorModal, retry, t])

  if (status === 'ready' && agent) {
    return (
      <AgentProvider agent={agent}>
        <OpenIDCredentialRecordProvider>{children}</OpenIDCredentialRecordProvider>
      </AgentProvider>
    )
  }

  return <LoadingScreen message={t('Init.InitializingAgent')} />
}

export default BCSCAgentProvider

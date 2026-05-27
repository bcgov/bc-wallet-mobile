import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { DidCommCredentialExchangeRecord } from '@credo-ts/didcomm'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export const useDeclineCredentialOffer = (credential: DidCommCredentialExchangeRecord) => {
  const { agent } = useBCSCAgent()
  const { t } = useTranslation()

  return useCallback(async () => {
    if (!agent) {
      return
    }
    try {
      await agent.modules.didcomm.credentials.declineOffer({ credentialExchangeRecordId: credential.id })

      const connectionId = credential.connectionId ?? ''
      if (connectionId) {
        const connection = await agent.modules.didcomm.connections.findById(connectionId)
        if (connection) {
          await agent.modules.didcomm.credentials.sendProblemReport({
            credentialExchangeRecordId: credential.id,
            description: t('CredentialOffer.Declined'),
          })
        }
      }
    } catch (err) {
      agent.config.logger.error(`Failed to decline credential offer: ${err}`)
    }
  }, [agent, credential.id, credential.connectionId, t])
}

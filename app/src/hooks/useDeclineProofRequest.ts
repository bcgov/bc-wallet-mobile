import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { DidCommProofExchangeRecord } from '@credo-ts/didcomm'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export const useDeclineProofRequest = (proof: DidCommProofExchangeRecord) => {
  const { agent } = useBCSCAgent()
  const { t } = useTranslation()

  return useCallback(async () => {
    if (!agent) {
      return
    }
    try {
      const connectionId = proof.connectionId ?? ''
      if (connectionId) {
        const connection = await agent.modules.didcomm.connections.findById(connectionId)
        if (connection) {
          await agent.modules.didcomm.proofs.sendProblemReport({
            proofExchangeRecordId: proof.id,
            description: t('ProofRequest.Declined'),
          })
        }
      }

      await agent.modules.didcomm.proofs.declineRequest({ proofExchangeRecordId: proof.id })
    } catch (err) {
      agent.config.logger.error(`Failed to decline proof request: ${err}`)
    }
  }, [agent, proof.id, proof.connectionId, t])
}

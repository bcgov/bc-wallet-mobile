import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { Agent } from '@credo-ts/core'
import { DidCommProofExchangeRecord } from '@credo-ts/didcomm'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export const declineProofRequest = async (
  agent: Agent,
  proof: Pick<DidCommProofExchangeRecord, 'id' | 'connectionId'>,
  description: string
) => {
  try {
    const connectionId = proof.connectionId ?? ''
    if (connectionId) {
      const connection = await agent.modules.didcomm.connections.findById(connectionId)
      if (connection) {
        await agent.modules.didcomm.proofs.sendProblemReport({
          proofExchangeRecordId: proof.id,
          description,
        })
      }
    }

    await agent.modules.didcomm.proofs.declineRequest({ proofExchangeRecordId: proof.id })
  } catch (err) {
    agent.config.logger.error(`Failed to decline proof request: ${err}`)
  }
}

export const useDeclineProofRequest = (proof: DidCommProofExchangeRecord) => {
  const { agent } = useBCSCAgent()
  const { t } = useTranslation()

  return useCallback(async () => {
    if (!agent) {
      return
    }
    await declineProofRequest(agent, proof, t('ProofRequest.Declined'))
  }, [agent, proof, t])
}

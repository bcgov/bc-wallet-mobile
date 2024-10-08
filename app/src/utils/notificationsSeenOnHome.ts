import {
  Agent,
  BasicMessageRecord,
  BasicMessageRepository,
  CredentialExchangeRecord,
  ProofExchangeRecord,
  SdJwtVcRecord,
  W3cCredentialRecord,
} from '@credo-ts/core'
import {
  basicMessageCustomMetadata,
  BasicMessageMetadata,
  CredentialMetadata,
} from '@hyperledger/aries-bifold-core/App/types/metadata'
import { CustomNotificationRecord } from '@hyperledger/aries-bifold-core/App/types/notification'
import { ProofMetadata } from '@hyperledger/aries-bifold-verifier'
import { ReducerAction } from 'react'

import { BCDispatchAction } from '../store'

const markMessageAsSeenOnHome = async (agent: Agent, record: BasicMessageRecord) => {
  const meta = record.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
  record.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, seenOnHome: true })
  const basicMessageRepository = agent.context.dependencyManager.resolve(BasicMessageRepository)
  await basicMessageRepository.update(agent.context, record)
}

const markProofAsSeenOnHome = async (agent: Agent, record: ProofExchangeRecord) => {
  record.metadata.set(ProofMetadata.customMetadata, { ...record.metadata.data.customMetadata, seenOnHome: true })
  return agent.proofs.update(record)
}

const markCredentialExchangeAsSeenOnHome = async (agent: Agent, record: CredentialExchangeRecord) => {
  record.metadata.set(CredentialMetadata.customMetadata, { ...record.metadata.data.customMetadata, seenOnHome: true })
  return agent.credentials.update(record)
}

// eslint-disable-next-line
const customNotificationSeenOnHome = async (dispatch?: React.Dispatch<ReducerAction<any>>) => {
  if (dispatch) {
    dispatch({
      type: BCDispatchAction.ATTESTATION_AUTHENTIFICATION_SEEN_ON_HOME,
      payload: [{ isSeenOnHome: true }],
    })
  }
}

export const notificationsSeenOnHome = async (
  agent: Agent,
  records: Array<
    | BasicMessageRecord
    | CredentialExchangeRecord
    | ProofExchangeRecord
    | CustomNotificationRecord
    | SdJwtVcRecord
    | W3cCredentialRecord
  >,
  // eslint-disable-next-line
  dispatch?: React.Dispatch<ReducerAction<any>>
) => {
  // eslint-disable-next-line
  for (const record of records) {
    if (record instanceof BasicMessageRecord) {
      await markMessageAsSeenOnHome(agent, record)
    } else if (record instanceof CredentialExchangeRecord) {
      await markCredentialExchangeAsSeenOnHome(agent, record)
    } else if (record instanceof ProofExchangeRecord) {
      await markProofAsSeenOnHome(agent, record)
    } else if ((record as CustomNotificationRecord).type === 'CustomNotification') {
      await customNotificationSeenOnHome(dispatch)
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { LegacyIndyCredentialFormat } from '@credo-ts/anoncreds'
import { CredentialExchangeRecord, CredentialProtocolOptions, ProofExchangeRecord } from '@credo-ts/core'

const useCredentials = jest.fn().mockReturnValue({ credentials: [] } as any)
const useCredentialByState = jest.fn().mockReturnValue([] as CredentialExchangeRecord[])
const useProofByState = jest.fn().mockReturnValue([] as ProofExchangeRecord[])
const mockCredentialModule = {
  acceptOffer: jest.fn(),
  declineOffer: jest.fn(),
  getFormatData: jest
    .fn()
    .mockReturnValue(
      Promise.resolve({} as CredentialProtocolOptions.GetCredentialFormatDataReturn<[LegacyIndyCredentialFormat]>)
    ),
}
const mockProofModule = {
  getCredentialsForRequest: jest.fn(),
  acceptRequest: jest.fn(),
  declineRequest: jest.fn(),
}
const useAgent = () => ({
  agent: {
    credentials: mockCredentialModule,
    proofs: mockProofModule,
    config: {
      logger: {
        info: jest.fn(),
      },
    },
    events: {
      observable: jest.fn().mockReturnValue({
        subscribe: jest.fn(),
      }),
    },
  },
})
const useCredentialById = jest.fn()
const useProofById = jest.fn()
const useConnectionById = jest.fn()

export {
  useAgent,
  useConnectionById,
  useCredentials,
  useCredentialById,
  useCredentialByState,
  useProofById,
  useProofByState,
}

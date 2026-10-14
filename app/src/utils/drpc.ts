import { DidCommConnectionRecord } from '@credo-ts/didcomm'
import { DrpcRequest, DrpcResponseObject } from '@credo-ts/drpc'
import { BCAgent } from '@utils/bc-agent-modules'

export type DrpcResponsePromise<T> = (responseTimeout: number) => Promise<T>

export type AttestationRequestParams = {
  attestation_object: string
  platform: 'apple' | 'google'
  os_version: string
  app_version: string
  key_id?: string // Apple only
  /**
   * Which issue-credential protocol to be issued over, v1 (legacy) or v2 (anoncreds endpoints)
   */
  credential_protocol?: 'v1' | 'v2'
  /**
   * hint as to which bundle ID / package name the request is sent from.
   */
  app_id_hint?: string
}

export type NonceDrpcResponse = DrpcResponseObject & {
  result?: {
    nonce: string
  }
}

export type AttestationResult = {
  status: 'success' | 'failure'
}

export type AttestationDrpcResponse = DrpcResponseObject & {
  result?: AttestationResult
}

// These are the methods that the DRPC server supports. They
// should map to a handler on the controller.
const DrpcMethod = {
  RequestNonceV2: 'request_nonce_v2',
  RequestAttestationV2: 'request_attestation_v2',
} as const

export const sendDrpcRequest = async (
  agent: BCAgent,
  connectionId: string,
  request: Omit<DrpcRequest, 'id' | 'jsonrpc'>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<DrpcResponsePromise<any>> => {
  const fullRequest = { jsonrpc: '2.0', id: Math.floor(Math.random() * 900000) + 100000, ...request } as DrpcRequest

  return await agent.modules.drpc.sendRequest(connectionId, fullRequest)
}

export const requestNonceDrpc = async (
  agent: BCAgent,
  connectionRecord: DidCommConnectionRecord
): Promise<DrpcResponsePromise<NonceDrpcResponse>> => {
  return await sendDrpcRequest(agent, connectionRecord.id, { method: DrpcMethod.RequestNonceV2 })
}

export const requestAttestationDrpc = async (
  agent: BCAgent,
  connectionRecord: DidCommConnectionRecord,
  params: AttestationRequestParams
): Promise<DrpcResponsePromise<AttestationDrpcResponse>> => {
  return await sendDrpcRequest(agent, connectionRecord.id, { method: DrpcMethod.RequestAttestationV2, params })
}

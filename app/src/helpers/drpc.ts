import { Agent, ConnectionRecord } from '@credo-ts/core'
import { DrpcRequest, DrpcResponseObject } from '@credo-ts/drpc'

export type DrpcResponsePromise<T> = (responseTimeout: number) => Promise<T>

export type AttestationRequestParams = {
  attestation_object: string
  platform: 'apple' | 'google'
  os_version: string
  app_version: string
  key_id?: string // Apple only
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
  agent: Agent,
  connectionId: string,
  request: Partial<DrpcRequest>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<DrpcResponsePromise<any>> => {
  const requestWithId = { jsonrpc: '2.0', id: Math.floor(Math.random() * 900000) + 100000, ...request }

  return await agent.modules.drpc.sendRequest(connectionId, requestWithId)
}

export const requestNonceDrpc = async (
  agent: Agent,
  connectionRecord: ConnectionRecord
): Promise<DrpcResponsePromise<NonceDrpcResponse>> => {
  const request: Partial<DrpcRequest> = {
    method: DrpcMethod.RequestNonceV2,
  }

  return await sendDrpcRequest(agent, connectionRecord.id, request)
}

export const requestAttestationDrpc = async (
  agent: Agent,
  connectionRecord: ConnectionRecord,
  params: AttestationRequestParams
): Promise<DrpcResponsePromise<AttestationDrpcResponse>> => {
  const request: Partial<DrpcRequest> = {
    method: DrpcMethod.RequestAttestationV2,
    params,
  }

  return await sendDrpcRequest(agent, connectionRecord.id, request)
}

import { Agent, ConnectionRecord } from '@credo-ts/core'
import { DrpcRequest, DrpcResponse } from '@credo-ts/drpc'

export type DrpcResponsePromise = (responseTimeout: number) => Promise<DrpcResponse | undefined>

export const sendDrpcRequest = async (
  agent: Agent,
  connectionId: string,
  request: Partial<DrpcRequest>
): Promise<DrpcResponsePromise> => {
  const requestWithId = { jsonrpc: '2.0', id: Math.floor(Math.random() * 900000) + 100000, ...request }
  return await agent.modules.drpc.sendRequest(connectionId, requestWithId)
}

export const requestNonceDrpc = async (
  agent: Agent,
  connectionRecord: ConnectionRecord
): Promise<DrpcResponsePromise> => {
  const request: Partial<DrpcRequest> = {
    method: 'request_nonce',
  }

  return await sendDrpcRequest(agent, connectionRecord.id, request)
}

export const requestAttestationDrpc = async (
  agent: Agent,
  connectionRecord: ConnectionRecord,
  params: any
): Promise<DrpcResponsePromise> => {
  const request: Partial<DrpcRequest> = {
    method: 'request_attestation',
    params,
  }

  return await sendDrpcRequest(agent, connectionRecord.id, request)
}

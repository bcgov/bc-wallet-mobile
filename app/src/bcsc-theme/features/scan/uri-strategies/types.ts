import type { BifoldLogger } from '@bifold/core'
import type { Agent } from '@credo-ts/core'

export type ScanResult =
  | { kind: 'connection'; oobRecordId: string }
  | { kind: 'unsupported'; reason: 'OpenID' | 'Mediator' | 'AgentNotReady' }
  | { kind: 'unrecognized' }

export interface ScanContext {
  agent: Agent | undefined
  logger: BifoldLogger
}

export interface UriStrategy {
  name: string
  matches(uri: string): boolean
  handle(uri: string, ctx: ScanContext): Promise<ScanResult>
}

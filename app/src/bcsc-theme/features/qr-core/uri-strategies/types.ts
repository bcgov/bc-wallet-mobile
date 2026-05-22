import type { BifoldLogger } from '@bifold/core'
import type { Agent } from '@credo-ts/core'

export type ScanResult =
  | { kind: 'connection'; oobRecordId: string }
  | { kind: 'pairing-code'; pairingCode: string }
  | { kind: 'unsupported'; reason: 'OpenID' | 'Mediator' | 'AgentNotReady' }
  | { kind: 'unrecognized' }

export interface ScanContext {
  agent: Agent | undefined
  logger: BifoldLogger
  /**
   * Label this wallet sends to the inviter when accepting an OOB invitation.
   * Becomes `theirLabel` on the inviter's connection record, surfacing as the
   * contact name in their chat header. Strategies should fall back to a
   * placeholder if absent.
   */
  label?: string
}

export interface UriStrategy {
  name: string
  matches(uri: string): boolean
  handle(uri: string, ctx: ScanContext): Promise<ScanResult>
}

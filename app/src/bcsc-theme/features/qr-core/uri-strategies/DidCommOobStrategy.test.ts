import type { BifoldLogger } from '@bifold/core'
import type { Agent } from '@credo-ts/core'

import DidCommOobStrategy from './DidCommOobStrategy'
import type { ScanContext } from './types'

const makeLogger = (): BifoldLogger =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  }) as unknown as BifoldLogger

const makeAgent = (overrides?: Partial<{ goalCode?: string; throwOnParse: boolean; recordId: string }>) => {
  const goalCode = overrides?.goalCode
  const throwOnParse = overrides?.throwOnParse ?? false
  const recordId = overrides?.recordId ?? 'oob-123'
  const parseInvitation = jest.fn(async () => {
    if (throwOnParse) {
      throw new Error('parse failed')
    }
    return goalCode === '__noparse__' ? null : { id: 'inv-1', goalCode }
  })
  const receiveInvitation = jest.fn(async () => ({ outOfBandRecord: { id: recordId } }))
  // Bifold's isMediatorInvitation reads agent.config.logger; provide a stub so the helper doesn't crash.
  const agentLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  return {
    agent: {
      config: { logger: agentLogger },
      modules: { didcomm: { oob: { parseInvitation, receiveInvitation } } },
    } as unknown as Agent,
    spies: { parseInvitation, receiveInvitation },
  }
}

const ctx = (agent: Agent | undefined): ScanContext => ({ agent, logger: makeLogger() })

describe('DidCommOobStrategy.matches', () => {
  it('matches DIDComm invitations and OpenID URIs (so handle can reject them with a clear reason)', () => {
    expect(DidCommOobStrategy.matches('https://x?oob=foo')).toBe(true)
    expect(DidCommOobStrategy.matches('openid://x')).toBe(true)
  })
  it('does not match unrelated URLs', () => {
    expect(DidCommOobStrategy.matches('https://www.gov.bc.ca')).toBe(false)
  })
})

describe('DidCommOobStrategy.handle', () => {
  it('returns AgentNotReady when agent is undefined', async () => {
    const result = await DidCommOobStrategy.handle('https://x?oob=foo', ctx(undefined))
    expect(result).toEqual({ kind: 'unsupported', reason: 'AgentNotReady' })
  })

  it('rejects OpenID credential offers', async () => {
    const { agent } = makeAgent()
    const result = await DidCommOobStrategy.handle('openid-credential-offer://abc', ctx(agent))
    expect(result).toEqual({ kind: 'unsupported', reason: 'OpenID' })
  })

  it('rejects OpenID presentation requests', async () => {
    const { agent } = makeAgent()
    const result = await DidCommOobStrategy.handle('openid://abc', ctx(agent))
    expect(result).toEqual({ kind: 'unsupported', reason: 'OpenID' })
  })

  it('rejects mediator invitations (goalCode aries.vc.mediate)', async () => {
    const { agent } = makeAgent({ goalCode: 'aries.vc.mediate' })
    const result = await DidCommOobStrategy.handle('https://x?oob=foo', ctx(agent))
    expect(result).toEqual({ kind: 'unsupported', reason: 'Mediator' })
  })

  it('returns unrecognized when invitation cannot be parsed', async () => {
    const { agent, spies } = makeAgent({ goalCode: '__noparse__' })
    // first parseInvitation call (mediator check) returns null too — both calls return null
    const result = await DidCommOobStrategy.handle('https://x?oob=foo', ctx(agent))
    expect(result).toEqual({ kind: 'unrecognized' })
    expect(spies.receiveInvitation).not.toHaveBeenCalled()
  })

  it('returns connection result with oobRecordId on success', async () => {
    const { agent, spies } = makeAgent({ recordId: 'rec-42' })
    const result = await DidCommOobStrategy.handle('https://x?oob=foo', ctx(agent))
    expect(result).toEqual({ kind: 'connection', oobRecordId: 'rec-42' })
    expect(spies.receiveInvitation).toHaveBeenCalledTimes(1)
  })
})

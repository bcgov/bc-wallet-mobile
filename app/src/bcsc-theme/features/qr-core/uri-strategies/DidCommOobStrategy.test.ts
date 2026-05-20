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

const makeAgent = (
  overrides?: Partial<{ goalCode?: string; throwOnParse: boolean; recordId: string; existingRecordId: string | null }>
) => {
  const goalCode = overrides?.goalCode
  const throwOnParse = overrides?.throwOnParse ?? false
  const recordId = overrides?.recordId ?? 'oob-123'
  const existingRecordId = overrides?.existingRecordId ?? null
  const parseInvitation = jest.fn(async () => {
    if (throwOnParse) {
      throw new Error('parse failed')
    }
    return goalCode === '__noparse__' ? null : { id: 'inv-1', goalCode }
  })
  const findByReceivedInvitationId = jest.fn(async () => (existingRecordId ? { id: existingRecordId } : null))
  const receiveInvitation = jest.fn(async () => ({ outOfBandRecord: { id: recordId } }))
  return {
    agent: {
      modules: { didcomm: { oob: { parseInvitation, findByReceivedInvitationId, receiveInvitation } } },
    } as unknown as Agent,
    spies: { parseInvitation, findByReceivedInvitationId, receiveInvitation },
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
    const result = await DidCommOobStrategy.handle('https://x?oob=foo', ctx(agent))
    expect(result).toEqual({ kind: 'unrecognized' })
    expect(spies.parseInvitation).toHaveBeenCalledTimes(1)
    expect(spies.receiveInvitation).not.toHaveBeenCalled()
  })

  it('parses the invitation exactly once on the success path', async () => {
    const { agent, spies } = makeAgent({ recordId: 'rec-1' })
    await DidCommOobStrategy.handle('https://x?oob=foo', ctx(agent))
    expect(spies.parseInvitation).toHaveBeenCalledTimes(1)
  })

  it('returns connection result with oobRecordId on success', async () => {
    const { agent, spies } = makeAgent({ recordId: 'rec-42' })
    const result = await DidCommOobStrategy.handle('https://x?oob=foo', ctx(agent))
    expect(result).toEqual({ kind: 'connection', oobRecordId: 'rec-42' })
    expect(spies.receiveInvitation).toHaveBeenCalledTimes(1)
  })

  it('reuses an existing OOB record instead of receiving the same invitation twice', async () => {
    const { agent, spies } = makeAgent({ existingRecordId: 'rec-existing' })
    const result = await DidCommOobStrategy.handle('https://x?oob=foo', ctx(agent))
    expect(result).toEqual({ kind: 'connection', oobRecordId: 'rec-existing' })
    expect(spies.findByReceivedInvitationId).toHaveBeenCalledWith('inv-1')
    expect(spies.receiveInvitation).not.toHaveBeenCalled()
  })
})

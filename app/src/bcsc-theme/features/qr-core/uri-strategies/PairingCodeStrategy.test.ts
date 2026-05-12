import { isDidCommInvitation, type BifoldLogger } from '@bifold/core'

import PairingCodeStrategy, { isPairingCode } from './PairingCodeStrategy'
import type { ScanContext } from './types'

const makeLogger = (): BifoldLogger =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  }) as unknown as BifoldLogger

describe('isPairingCode', () => {
  it('matches plain alphanumeric codes within length bounds', () => {
    expect(isPairingCode('ABC123')).toBe(true)
    expect(isPairingCode('XYZ12ABCDE')).toBe(true)
  })

  it('rejects codes outside length bounds', () => {
    expect(isPairingCode('ABC')).toBe(false)
    expect(isPairingCode('ABCDEFGHIJKLMN')).toBe(false)
  })

  it('rejects URLs and lower-case strings', () => {
    expect(isPairingCode('didcomm://oob?abc=1')).toBe(false)
    expect(isPairingCode('abc123')).toBe(false)
  })

  it('trims surrounding whitespace before matching', () => {
    expect(isPairingCode('  ABC123  ')).toBe(true)
  })
})

describe('PairingCodeStrategy', () => {
  it('returns unsupported with PairingCodePending reason today (real handler tracked separately)', async () => {
    const ctx: ScanContext = { agent: undefined, logger: makeLogger() }
    const result = await PairingCodeStrategy.handle('ABC123', ctx)
    expect(result).toEqual({ kind: 'unsupported', reason: 'PairingCodePending' })
    expect(ctx.logger.info).toHaveBeenCalled()
  })
})

// Boundary assumption: DEFAULT_STRATEGIES lists DidCommOob before PairingCode
// and uses Array.find first-match. PairingCode is the catch-all looser matcher.
// If Bifold ever loosens `isDidCommInvitation` such that bare alphanumeric
// strings classify as DIDComm, pairing codes would be silently shadowed.
describe('strategy ordering boundary', () => {
  it('isDidCommInvitation does not match a bare alphanumeric pairing-code shape — keeps PairingCode reachable', () => {
    expect(isDidCommInvitation('ABC123')).toBe(false)
    expect(isDidCommInvitation('XYZ12ABCDE')).toBe(false)
  })
})

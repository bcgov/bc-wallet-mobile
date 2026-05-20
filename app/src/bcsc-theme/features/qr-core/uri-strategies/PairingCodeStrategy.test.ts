import { isDidCommInvitation, type BifoldLogger } from '@bifold/core'

import PairingCodeStrategy, { extractPairingCode } from './PairingCodeStrategy'
import type { ScanContext } from './types'

const makeLogger = (): BifoldLogger =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  }) as unknown as BifoldLogger

const DEMO_URL = 'https://idsit.gov.bc.ca/static/pairingqrcode.html#SKGAZZ'

describe('extractPairingCode', () => {
  it('extracts the fragment from the BC Parks demo URL shape', () => {
    expect(extractPairingCode(DEMO_URL)).toBe('SKGAZZ')
  })

  it('is host-agnostic (any host with pairingqrcode.html path)', () => {
    expect(extractPairingCode('https://www.example.com/static/pairingqrcode.html#ABCDEF')).toBe('ABCDEF')
  })

  it('rejects URLs without a fragment', () => {
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html')).toBeNull()
  })

  it('rejects fragments shorter or longer than PAIRING_CODE_LENGTH', () => {
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html#ABC')).toBeNull()
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html#ABCDEFGH')).toBeNull()
  })

  it('rejects fragments containing non-alphanumeric or lowercase characters', () => {
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html#abc123')).toBeNull()
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html#AB-123')).toBeNull()
  })

  it('rejects URLs without the pairingqrcode.html path', () => {
    expect(extractPairingCode('https://www.gov.bc.ca/#SKGAZZ')).toBeNull()
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/other.html#SKGAZZ')).toBeNull()
  })

  it('rejects unparseable inputs', () => {
    expect(extractPairingCode('not a url')).toBeNull()
    expect(extractPairingCode('')).toBeNull()
    expect(extractPairingCode('SKGAZZ')).toBeNull()
  })
})

describe('PairingCodeStrategy.matches', () => {
  it('matches the BC Parks demo URL', () => {
    expect(PairingCodeStrategy.matches(DEMO_URL)).toBe(true)
  })

  it('does not match DIDComm, OpenID, or random URLs', () => {
    expect(PairingCodeStrategy.matches('didcomm://oob?abc=1')).toBe(false)
    expect(PairingCodeStrategy.matches('openid://abc')).toBe(false)
    expect(PairingCodeStrategy.matches('https://www.gov.bc.ca')).toBe(false)
  })
})

describe('PairingCodeStrategy.handle', () => {
  it('returns pairing-code with the extracted fragment', async () => {
    const ctx: ScanContext = { agent: undefined, logger: makeLogger() }
    const result = await PairingCodeStrategy.handle(DEMO_URL, ctx)
    expect(result).toEqual({ kind: 'pairing-code', pairingCode: 'SKGAZZ' })
  })

  it('returns unrecognized + logs warn if matches passes but extraction fails', async () => {
    // Defensive guard — matches() and extractPairingCode() share the same logic,
    // so this branch is only reachable if the URL parser produces inconsistent results.
    const ctx: ScanContext = { agent: undefined, logger: makeLogger() }
    const result = await PairingCodeStrategy.handle('not a url', ctx)
    expect(result).toEqual({ kind: 'unrecognized' })
    expect(ctx.logger.warn).toHaveBeenCalled()
  })
})

// Boundary assumption: DidCommOob runs first in DEFAULT_STRATEGIES.
// PairingCode now matches a different URL shape (pairingqrcode.html), so the
// strategies are disjoint, but pin the negative case in case Bifold ever
// loosens isDidCommInvitation to accept the pairing-QR shape.
describe('strategy ordering boundary', () => {
  it('isDidCommInvitation does not match the pairing-QR URL shape', () => {
    expect(isDidCommInvitation(DEMO_URL)).toBe(false)
  })
})

import { renderHook } from '@testing-library/react-native'

import { extractPairingCode, usePairingCodeQRCodeStrategy } from './usePairingCodeQRCodeStrategy'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@bifold/core', () => ({
  QrCodeScanError: class QrCodeScanError extends Error {},
}))

const DEMO_URL = 'https://idsit.gov.bc.ca/static/pairingqrcode.html#SKGAZZ'

describe('extractPairingCode', () => {
  it('extracts the fragment from the pairing QR URL shape', () => {
    expect(extractPairingCode(DEMO_URL)).toBe('SKGAZZ')
  })

  it('is host-agnostic (any host with a pairingqrcode.html path)', () => {
    expect(extractPairingCode('https://www.example.com/static/pairingqrcode.html#ABCDEF')).toBe('ABCDEF')
  })

  it('rejects URLs without a fragment', () => {
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html')).toBeNull()
  })

  it('rejects fragments shorter or longer than the pairing code length', () => {
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html#ABC')).toBeNull()
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html#ABCDEFGH')).toBeNull()
  })

  it('rejects lowercase or non-alphanumeric fragments', () => {
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html#abc123')).toBeNull()
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/pairingqrcode.html#AB-123')).toBeNull()
  })

  it('rejects other paths', () => {
    expect(extractPairingCode('https://www.gov.bc.ca/#SKGAZZ')).toBeNull()
    expect(extractPairingCode('https://idsit.gov.bc.ca/static/other.html#SKGAZZ')).toBeNull()
  })

  it('rejects unparseable input', () => {
    expect(extractPairingCode('not a url')).toBeNull()
    expect(extractPairingCode('')).toBeNull()
    expect(extractPairingCode('SKGAZZ')).toBeNull()
  })
})

describe('usePairingCodeQRCodeStrategy', () => {
  const onSuccess = jest.fn()
  const setup = () => renderHook(() => usePairingCodeQRCodeStrategy(onSuccess)).result.current

  beforeEach(() => jest.clearAllMocks())

  it('matches a pairing QR and nothing else', () => {
    const { matches } = setup()

    expect(matches(DEMO_URL)).toBe(true)
    expect(matches('didcomm://oob?abc=1')).toBe(false)
    expect(matches('openid://abc')).toBe(false)
    expect(matches('https://www.gov.bc.ca')).toBe(false)
  })

  it('calls onSuccess with the extracted pairing code', async () => {
    await setup().handle(DEMO_URL)

    expect(onSuccess).toHaveBeenCalledWith('SKGAZZ')
  })

  it('throws an unrecognized error without calling onSuccess when no code can be extracted', async () => {
    expect(() => setup().handle('https://www.gov.bc.ca')).toThrow('BCSC.Scan.UnrecognizedQR')

    expect(onSuccess).not.toHaveBeenCalled()
  })
})

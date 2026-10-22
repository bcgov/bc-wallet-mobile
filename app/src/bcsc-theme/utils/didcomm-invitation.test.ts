import { isDidCommInvitationCandidate } from './didcomm-invitation'

describe('isDidCommInvitationCandidate', () => {
  it.each([
    'didcomm://invite?oob=abc',
    'bcwallet://aries_connection_invitation?oob=abc',
    'https://issuer.example.com?c_i=abc',
    'https://issuer.example.com/abc123',
    'http://localhost:8020/abc123',
  ])('returns true for %s', (uri) => {
    expect(isDidCommInvitationCandidate(uri)).toBe(true)
  })

  it.each(['not a url', 'ABC123', 'bcwallet://something/else', 'ftp://example.com/abc123'])(
    'returns false for %s',
    (uri) => {
      expect(isDidCommInvitationCandidate(uri)).toBe(false)
    }
  )
})

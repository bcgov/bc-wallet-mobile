import { compareCredentialMetadata, tokenToCredentialMetadata } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { BCSCEvent, BCSCReason, IdToken } from '@/bcsc-theme/utils/id-token'
import { CredentialMetadata } from '@/store'

const createMockIdToken = (overrides?: Partial<IdToken>): IdToken => ({
  sub: 'test-sub',
  aud: 'test-aud',
  iss: 'test-iss',
  exp: 1234567890,
  iat: '1234567890',
  jti: 'test-jti',
  family_name: 'Doe',
  given_name: 'Jamie',
  bcsc_card_type: 'Combined' as any,
  bcsc_event: BCSCEvent.Authorization,
  bcsc_reason: BCSCReason.ApprovedByAgent,
  bcsc_status_date: 1234567890,
  acr: 0,
  bcsc_devices_count: 1,
  bcsc_max_devices: 5,
  hasActivePersonCredential: true,
  bcsc_account_type: 'BC Services Card with photo' as any,
  ...overrides,
})

const createMockMetadata = (overrides?: Partial<CredentialMetadata>): CredentialMetadata => ({
  fullName: 'Jamie Doe',
  bcscReason: BCSCReason.ApprovedByAgent,
  deviceCount: 1,
  deviceLimit: 5,
  cardType: 'Combined',
  lastUpdated: 1234567890,
  ...overrides,
})

describe('BCSCIdTokenContext', () => {
  describe('tokenToCredentialMetadata', () => {
    it('returns the joined full name for a two-name token', () => {
      const token = createMockIdToken({ given_name: 'Jamie', family_name: 'Doe' })

      expect(tokenToCredentialMetadata(token).fullName).toBe('Jamie Doe')
    })

    it('returns just the family name for a mononym token (no "undefined" artifact)', () => {
      const token = createMockIdToken({ given_name: undefined, family_name: 'Doe' })

      expect(tokenToCredentialMetadata(token).fullName).toBe('Doe')
    })

    it('maps the remaining token fields', () => {
      const token = createMockIdToken({
        bcsc_reason: BCSCReason.Renew,
        bcsc_devices_count: 2,
        bcsc_max_devices: 6,
        bcsc_card_type: 'Combined' as any,
        bcsc_status_date: 999,
      })

      expect(tokenToCredentialMetadata(token)).toMatchObject({
        bcscReason: BCSCReason.Renew,
        deviceCount: 2,
        deviceLimit: 6,
        cardType: 'Combined',
        lastUpdated: 999,
      })
    })
  })

  describe('compareCredentialMetadata', () => {
    it('returns false when either argument is undefined', () => {
      const metadata = createMockMetadata()

      expect(compareCredentialMetadata(undefined, metadata)).toBe(false)
      expect(compareCredentialMetadata(metadata, undefined)).toBe(false)
      expect(compareCredentialMetadata(undefined, undefined)).toBe(false)
    })

    it('returns true for identical metadata', () => {
      const metadata = createMockMetadata()

      expect(compareCredentialMetadata(metadata, { ...metadata })).toBe(true)
    })

    it('returns false when a non-fullName field differs', () => {
      const c1 = createMockMetadata()
      const c2 = createMockMetadata({ deviceCount: 2 })

      expect(compareCredentialMetadata(c1, c2)).toBe(false)
    })

    // #4258 user decision: normalize the legacy `${given_name} ${family_name}` mononym
    // artifact so the fullName bugfix doesn't fire a one-time false "account updated" alert.
    it('treats a legacy "undefined <name>" stored fullName as equal to the corrected mononym fullName', () => {
      const legacyStored = createMockMetadata({ fullName: 'undefined Smith' })
      const corrected = createMockMetadata({ fullName: 'Smith' })

      expect(compareCredentialMetadata(corrected, legacyStored)).toBe(true)
    })

    it('treats a legacy stray-leading-space stored fullName as equal to the corrected mononym fullName', () => {
      const legacyStored = createMockMetadata({ fullName: ' Smith' })
      const corrected = createMockMetadata({ fullName: 'Smith' })

      expect(compareCredentialMetadata(corrected, legacyStored)).toBe(true)
    })

    // Regression: when BOTH given_name and family_name were absent, the legacy template
    // rendered the literal "undefined undefined" (one "undefined" per absent part), which
    // must normalize the same as getFullDisplayName({})'s '' -- otherwise every account with
    // no name on file at all would get a spurious one-time "account updated" alert.
    it('treats a legacy "undefined undefined" stored fullName as equal to a fresh empty fullName', () => {
      const legacyStored = createMockMetadata({ fullName: 'undefined undefined' })
      const corrected = createMockMetadata({ fullName: '' })

      expect(compareCredentialMetadata(corrected, legacyStored)).toBe(true)
    })

    // Documents the accepted tradeoff: the normalization matches the literal lowercase
    // "undefined" string JS produces when interpolating a real `undefined` value, so it's
    // scoped to that exact case. A genuine name is safe as long as it isn't literally the
    // lowercase word "undefined" -- e.g. capitalized "Undefined" (a real name) is untouched,
    // since the match is case-sensitive.
    it('does not touch a genuine name that starts with capitalized "Undefined"', () => {
      const c1 = createMockMetadata({ fullName: 'Undefined Smith' })
      const c2 = createMockMetadata({ fullName: 'Undefined Smith' })

      expect(compareCredentialMetadata(c1, c2)).toBe(true)
      expect(compareCredentialMetadata(c1, createMockMetadata({ fullName: 'Smith' }))).toBe(false)
    })

    it('still returns false for genuinely different names', () => {
      const c1 = createMockMetadata({ fullName: 'John Smith' })
      const c2 = createMockMetadata({ fullName: 'Jane Smith' })

      expect(compareCredentialMetadata(c1, c2)).toBe(false)
    })

    it('still returns false when a legacy-normalized mononym name differs from a genuinely different name', () => {
      const legacyStored = createMockMetadata({ fullName: 'undefined Smith' })
      const differentName = createMockMetadata({ fullName: 'Jones' })

      expect(compareCredentialMetadata(differentName, legacyStored)).toBe(false)
    })
  })
})

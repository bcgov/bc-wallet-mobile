import { AccountPhaseType, ExpiryFacts, getAccountPhase } from './account-phase'

const NOW = new Date('2026-10-19T12:00:00.000Z')

const facts = (overrides: Partial<ExpiryFacts> = {}): ExpiryFacts => ({
  isVerified: true,
  expiredByServer: false,
  credentialExpired: false,
  cardExpiresAt: new Date('2027-10-19T00:00:00.000Z'),
  ...overrides,
})

describe('getAccountPhase', () => {
  it('is none when the user is not verified, whatever the other inputs say', () => {
    expect(getAccountPhase(facts({ isVerified: false, expiredByServer: true, credentialExpired: true }), NOW)).toEqual({
      phase: AccountPhaseType.None,
    })
  })

  it('is expired when the server expired the card, even with a future date', () => {
    expect(getAccountPhase(facts({ expiredByServer: true }), NOW)).toEqual({
      phase: AccountPhaseType.Expired,
      expiresAt: new Date('2027-10-19T00:00:00.000Z'),
    })
  })

  it('is expired when the server expired a card that is also inside the renewal window', () => {
    const phase = getAccountPhase(
      facts({ expiredByServer: true, cardExpiresAt: new Date('2026-10-27T00:00:00.000Z') }),
      NOW
    )

    expect(phase.phase).toBe(AccountPhaseType.Expired)
  })

  // #4654: hydration flags the token before userinfo can load, so there is no account
  it.each([
    ['the server expired the card', { expiredByServer: true }],
    ['the stored refresh token expired', { credentialExpired: true }],
  ])('is expired with no account loaded when %s', (_name, signal) => {
    expect(getAccountPhase(facts({ ...signal, cardExpiresAt: undefined }), NOW)).toEqual({
      phase: AccountPhaseType.Expired,
    })
  })

  it('is unknown when verified with no date and no server signal, so a failed account load shows no notice', () => {
    expect(getAccountPhase(facts({ cardExpiresAt: undefined }), NOW)).toEqual({ phase: AccountPhaseType.Unknown })
  })

  it('is unknown when the date is invalid', () => {
    expect(getAccountPhase(facts({ cardExpiresAt: new Date('not a date') }), NOW)).toEqual({
      phase: AccountPhaseType.Unknown,
    })
  })

  it.each([
    ['today', '2026-10-19', AccountPhaseType.Expired],
    ['yesterday', '2026-10-18', AccountPhaseType.Expired],
    ['tomorrow', '2026-10-20', AccountPhaseType.ExpiringSoon],
    ['30 days out', '2026-11-18', AccountPhaseType.ExpiringSoon],
    ['31 days out', '2026-11-19', AccountPhaseType.Active],
  ])('with an expiry date of %s (%s) is %s', (_name, date, phase) => {
    expect(getAccountPhase(facts({ cardExpiresAt: new Date(`${date}T00:00:00.000Z`) }), NOW).phase).toBe(phase)
  })

  it('carries the expiry date in the expiringSoon and active phases', () => {
    const soon = new Date('2026-10-27T00:00:00.000Z')
    const later = new Date('2027-10-19T00:00:00.000Z')

    expect(getAccountPhase(facts({ cardExpiresAt: soon }), NOW)).toEqual({
      phase: AccountPhaseType.ExpiringSoon,
      expiresAt: soon,
    })
    expect(getAccountPhase(facts({ cardExpiresAt: later }), NOW)).toEqual({
      phase: AccountPhaseType.Active,
      expiresAt: later,
    })
  })
})

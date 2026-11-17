import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { EXPIRED_JWT, makeJwt } from '@/bcsc-theme/utils/__fixtures__/jwt'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState } from '@/store'
import { AccountPhaseType } from './account-phase'
import { selectAccountPhase } from './selectors'

const NOW = new Date('2026-10-19T12:00:00.000Z')
const FUTURE = new Date('2027-10-19T00:00:00.000Z')

const buildState = (opts: { verified?: boolean; bcscReason?: BCSCReason; refreshToken?: string } = {}) =>
  ({
    bcscSecure: { verified: opts.verified ?? true, refreshToken: opts.refreshToken },
    bcsc: { credentialMetadata: { bcscReason: opts.bcscReason ?? BCSCReason.ApprovedByAgent } },
  }) as unknown as BCState

const buildAccount = (date: Date) => ({ account_expiration_date: date }) as unknown as BCSCAccount

describe('selectAccountPhase', () => {
  it('reads verified from secure state', () => {
    expect(selectAccountPhase(buildState({ verified: false }), buildAccount(FUTURE), NOW).phase).toBe(
      AccountPhaseType.None
    )
    expect(selectAccountPhase(buildState({ verified: true }), buildAccount(FUTURE), NOW).phase).toBe(
      AccountPhaseType.Active
    )
  })

  it('reads the server expiry from the credential metadata bcscReason', () => {
    const state = buildState({ bcscReason: BCSCReason.ExpiredBySystem })

    expect(selectAccountPhase(state, buildAccount(FUTURE), NOW).phase).toBe(AccountPhaseType.Expired)
  })

  it('derives the credential expiry from the stored refresh token', () => {
    expect(selectAccountPhase(buildState({ refreshToken: EXPIRED_JWT }), null, NOW).phase).toBe(
      AccountPhaseType.Expired
    )
  })

  it('expires the credential as time passes, with no change to the store', () => {
    const state = buildState({ refreshToken: makeJwt({ exp: NOW.getTime() / 1000 + 3600 }) })
    const twoHoursLater = new Date(NOW.getTime() + 2 * 3600_000)

    expect(selectAccountPhase(state, null, NOW).phase).not.toBe(AccountPhaseType.Expired)
    expect(selectAccountPhase(state, null, twoHoursLater).phase).toBe(AccountPhaseType.Expired)
  })

  it('reads the card expiry date from the account, and is unknown without one', () => {
    expect(selectAccountPhase(buildState(), null, NOW).phase).toBe(AccountPhaseType.Unknown)
    expect(selectAccountPhase(buildState(), buildAccount(new Date('2026-10-27T00:00:00.000Z')), NOW).phase).toBe(
      AccountPhaseType.ExpiringSoon
    )
  })

  it('tolerates missing credential metadata', () => {
    const state = { bcscSecure: { verified: true }, bcsc: {} } as unknown as BCState

    expect(selectAccountPhase(state, buildAccount(FUTURE), NOW).phase).toBe(AccountPhaseType.Active)
  })
})

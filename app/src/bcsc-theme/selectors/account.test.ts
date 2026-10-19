import { BCSCAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState } from '@/store'
import { selectAccountPhase } from './account'

const NOW = new Date('2026-10-19T12:00:00.000Z')
const FUTURE = new Date('2027-10-19T00:00:00.000Z')

const buildState = (opts: { verified?: boolean; bcscReason?: BCSCReason; refreshTokenExpired?: boolean } = {}) =>
  ({
    bcscSecure: { verified: opts.verified ?? true, refreshTokenExpired: opts.refreshTokenExpired },
    bcsc: { credentialMetadata: { bcscReason: opts.bcscReason ?? BCSCReason.ApprovedByAgent } },
  }) as unknown as BCState

const buildAccount = (date: Date) => ({ account_expiration_date: date }) as unknown as BCSCAccount

describe('selectAccountPhase', () => {
  it('reads verified from secure state', () => {
    expect(selectAccountPhase(buildState({ verified: false }), buildAccount(FUTURE), NOW).phase).toBe('none')
    expect(selectAccountPhase(buildState({ verified: true }), buildAccount(FUTURE), NOW).phase).toBe('active')
  })

  it('reads the server expiry from the credential metadata bcscReason', () => {
    const state = buildState({ bcscReason: BCSCReason.ExpiredBySystem })

    expect(selectAccountPhase(state, buildAccount(FUTURE), NOW).phase).toBe('expired')
  })

  it('reads refreshTokenExpired from secure state', () => {
    expect(selectAccountPhase(buildState({ refreshTokenExpired: true }), null, NOW).phase).toBe('expired')
  })

  it('reads the card expiry date from the account, and is unknown without one', () => {
    expect(selectAccountPhase(buildState(), null, NOW).phase).toBe('unknown')
    expect(selectAccountPhase(buildState(), buildAccount(new Date('2026-10-27T00:00:00.000Z')), NOW).phase).toBe(
      'expiringSoon'
    )
  })

  it('tolerates missing credential metadata', () => {
    const state = { bcscSecure: { verified: true }, bcsc: {} } as unknown as BCState

    expect(selectAccountPhase(state, buildAccount(FUTURE), NOW).phase).toBe('active')
  })
})

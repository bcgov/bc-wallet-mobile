import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import * as Bifold from '@bifold/core'
import { renderHook } from '@testing-library/react-native'
import { useAccount } from '../contexts/BCSCAccountContext'
import { useCardStatus } from './useCardStatus'

jest.mock('@bifold/core')
jest.mock('../contexts/BCSCAccountContext', () => ({ useAccount: jest.fn() }))

const DAY_MS = 24 * 60 * 60 * 1000
const futureExpiry = new Date(Date.now() + 365 * DAY_MS)
const pastExpiry = new Date(Date.now() - 30 * DAY_MS)

const mockStore = (opts: { verified?: boolean; bcscReason?: BCSCReason }) => {
  jest.mocked(Bifold.useStore).mockReturnValue([
    {
      bcscSecure: { verified: opts.verified ?? true },
      bcsc: { credentialMetadata: { bcscReason: opts.bcscReason ?? BCSCReason.ApprovedByAgent } },
    } as any,
    jest.fn(),
  ])
}

const mockAccount = (expiry: Date | null) => {
  jest.mocked(useAccount).mockReturnValue({ account: expiry ? { account_expiration_date: expiry } : null } as any)
}

describe('useCardStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('is actively verified when the card is verified and the expiry date has not passed', () => {
    mockStore({})
    mockAccount(futureExpiry)

    const { result } = renderHook(() => useCardStatus())

    expect(result.current.isExpired).toBe(false)
    expect(result.current.isActivelyVerified).toBe(true)
  })

  it('is expired once the expiry date has passed', () => {
    mockStore({})
    mockAccount(pastExpiry)

    const { result } = renderHook(() => useCardStatus())

    expect(result.current.isExpired).toBe(true)
    expect(result.current.isActivelyVerified).toBe(false)
  })

  // IAS can expire an account server-side before its printed expiry date. Previously this reason
  // was read as an "emergency mode" that bypassed the expiry check, leaving a deactivated user
  // with Services, pairing, and the verified home still open to them.
  it('is expired when IAS reports ExpiredBySystem, even if the expiry date is in the future', () => {
    mockStore({ bcscReason: BCSCReason.ExpiredBySystem })
    mockAccount(futureExpiry)

    const { result } = renderHook(() => useCardStatus())

    expect(result.current.isExpired).toBe(true)
    expect(result.current.isActivelyVerified).toBe(false)
  })

  it('is not expired when the user is not verified, so they are routed to verify rather than renew', () => {
    mockStore({ verified: false, bcscReason: BCSCReason.ExpiredBySystem })
    mockAccount(pastExpiry)

    const { result } = renderHook(() => useCardStatus())

    expect(result.current.isExpired).toBe(false)
    expect(result.current.isActivelyVerified).toBe(false)
  })

  it('is not expired when no account has loaded yet', () => {
    mockStore({})
    mockAccount(null)

    const { result } = renderHook(() => useCardStatus())

    expect(result.current.isExpired).toBe(false)
  })
})

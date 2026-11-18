import { BCSCAccount, useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState } from '@/store'
import { renderHook } from '@testing-library/react-native'
import { AccountPhaseType } from './account-phase'
import { useAccountPhase } from './useAccountPhase'

const mockUseStore = jest.fn()

jest.mock('@bifold/core', () => ({
  useStore: () => mockUseStore(),
}))
jest.mock('@/bcsc-theme/contexts/BCSCAccountContext', () => ({ useAccount: jest.fn() }))

const DAY_MS = 24 * 60 * 60 * 1000

const daysFromNow = (days: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return new Date(date.getTime() + days * DAY_MS + 12 * 60 * 60 * 1000)
}

const buildStore = (bcscReason = BCSCReason.ApprovedByAgent) =>
  ({
    bcscSecure: { verified: true },
    bcsc: { credentialMetadata: { bcscReason } },
  }) as unknown as BCState

const buildAccount = (date: Date) => ({ account_expiration_date: date }) as unknown as BCSCAccount

const setAccount = (account: BCSCAccount | null) => {
  jest.mocked(useAccount).mockReturnValue({ account, isLoadingAccount: false, refreshAccount: jest.fn() })
}

describe('useAccountPhase', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseStore.mockReturnValue([buildStore(), jest.fn()])
  })

  it('drops the renewal phase when the account reloads with a renewed expiry date', () => {
    setAccount(buildAccount(daysFromNow(8)))
    const { result, rerender } = renderHook(() => useAccountPhase())
    expect(result.current.phase).toBe(AccountPhaseType.ExpiringSoon)

    setAccount(buildAccount(daysFromNow(365)))
    rerender({})

    expect(result.current.phase).toBe(AccountPhaseType.Active)
  })

  it('is unknown for a verified user whose account has not loaded', () => {
    setAccount(null)

    const { result } = renderHook(() => useAccountPhase())

    expect(result.current).toEqual({ phase: AccountPhaseType.Unknown })
  })

  it('is expired when the server expired the card, whatever the date', () => {
    mockUseStore.mockReturnValue([buildStore(BCSCReason.ExpiredBySystem), jest.fn()])
    setAccount(buildAccount(daysFromNow(365)))

    const { result } = renderHook(() => useAccountPhase())

    expect(result.current.phase).toBe(AccountPhaseType.Expired)
  })
})

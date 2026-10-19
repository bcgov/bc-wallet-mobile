import { BCSCAccount, useAccount } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BCState } from '@/store'
import { renderHook } from '@testing-library/react-native'
import { useAccountPhase } from './useAccountPhase'

let mockLogger = { info: jest.fn() }
const mockUseStore = jest.fn()

jest.mock('@bifold/core', () => ({
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useStore: () => mockUseStore(),
  useServices: () => [mockLogger],
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
    // Each test gets its own logger identity, which is what the change-dedupe is keyed on
    mockLogger = { info: jest.fn() }
    mockUseStore.mockReturnValue([buildStore(), jest.fn()])
  })

  it('drops the renewal phase when the account reloads with a renewed expiry date', () => {
    setAccount(buildAccount(daysFromNow(8)))
    const { result, rerender } = renderHook(() => useAccountPhase())
    expect(result.current.phase).toBe('expiringSoon')

    setAccount(buildAccount(daysFromNow(365)))
    rerender({})

    expect(result.current.phase).toBe('active')
  })

  it('is unknown for a verified user whose account has not loaded', () => {
    setAccount(null)

    const { result } = renderHook(() => useAccountPhase())

    expect(result.current).toEqual({ phase: 'unknown' })
  })

  it('keeps the phase of the last loaded account until a new one arrives', () => {
    const account = buildAccount(daysFromNow(8))
    setAccount(account)
    const { result, rerender } = renderHook(() => useAccountPhase())

    // a failed refresh leaves the provider's account untouched
    setAccount(account)
    rerender({})

    expect(result.current.phase).toBe('expiringSoon')
  })

  it('is expired when the server expired the card, whatever the date', () => {
    mockUseStore.mockReturnValue([buildStore(BCSCReason.ExpiredBySystem), jest.fn()])
    setAccount(buildAccount(daysFromNow(365)))

    const { result } = renderHook(() => useAccountPhase())

    expect(result.current.phase).toBe('expired')
  })

  describe('logging', () => {
    it('logs the phase and days remaining once, with no personal details', () => {
      setAccount(buildAccount(daysFromNow(8)))

      const { rerender } = renderHook(() => useAccountPhase())
      rerender({})

      expect(mockLogger.info).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[useAccountPhase] Card expiry phase: expiringSoon, 8 days remaining'
      )
    })

    it('logs again when the phase changes', () => {
      setAccount(buildAccount(daysFromNow(8)))
      const { rerender } = renderHook(() => useAccountPhase())

      setAccount(buildAccount(daysFromNow(365)))
      rerender({})

      expect(mockLogger.info).toHaveBeenCalledTimes(2)
      expect(mockLogger.info).toHaveBeenLastCalledWith(
        '[useAccountPhase] Card expiry phase: active, 365 days remaining'
      )
    })

    it('logs without a day count when there is no date', () => {
      setAccount(null)

      renderHook(() => useAccountPhase())

      expect(mockLogger.info).toHaveBeenCalledWith('[useAccountPhase] Card expiry phase: unknown')
    })

    it('logs once when several components use the hook at the same time', () => {
      setAccount(buildAccount(daysFromNow(8)))

      renderHook(() => {
        useAccountPhase()
        useAccountPhase()
      })

      expect(mockLogger.info).toHaveBeenCalledTimes(1)
    })
  })
})

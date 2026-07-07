import CardExpiryNotification from '@/bcsc-theme/features/notifications/CardExpiryNotification'
import CardRenewalNotification from '@/bcsc-theme/features/notifications/CardRenewalNotification'
import StartVerificationNotification from '@/bcsc-theme/features/notifications/StartVerificationNotification'
import * as VerificationStatusModule from '@/bcsc-theme/hooks/useVerificationStatus'
import { useStore } from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { CustomNotificationId, useCustomNotifications } from './useCustomNotifications'

jest.mock('@bifold/core', () => ({
  useStore: jest.fn(),
}))
jest.mock('@/bcsc-theme/hooks/useVerificationStatus', () => ({
  useVerificationStatus: jest.fn(),
}))
jest.mock(
  '@/bcsc-theme/features/notifications/CardExpiryNotification',
  () =>
    function MockCardExpiryNotification() {
      return null
    }
)
jest.mock(
  '@/bcsc-theme/features/notifications/CardRenewalNotification',
  () =>
    function MockCardRenewalNotification() {
      return null
    }
)
jest.mock(
  '@/bcsc-theme/features/notifications/StartVerificationNotification',
  () =>
    function MockStartVerificationNotification() {
      return null
    }
)

const makeStore = (bcscOverrides: Record<string, unknown> = {}) => [
  { bcsc: { showAccountExpiryNotification: false, showCardRenewalNotification: false, ...bcscOverrides } },
  jest.fn(),
]

describe('useCustomNotifications', () => {
  beforeEach(() => {
    jest.mocked(useStore).mockReturnValue(makeStore() as any)
    jest.mocked(VerificationStatusModule.useVerificationStatus).mockReturnValue({
      needsVerification: false,
      isVerified: true,
      isVerificationInProgress: false,
      isDeactivated: false,
    })
  })

  it('returns no notifications by default', () => {
    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(0)
  })

  it('includes CardExpiryNotification when showAccountExpiryNotification is true', () => {
    jest.mocked(useStore).mockReturnValue(makeStore({ showAccountExpiryNotification: true }) as any)

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].type).toBe(CardExpiryNotification)
  })

  it('includes CardRenewalNotification when showCardRenewalNotification is true', () => {
    jest.mocked(useStore).mockReturnValue(makeStore({ showCardRenewalNotification: true }) as any)

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].type).toBe(CardRenewalNotification)
  })

  it('includes StartVerificationNotification when needsVerification is true', () => {
    jest.mocked(VerificationStatusModule.useVerificationStatus).mockReturnValue({
      needsVerification: true,
      isVerified: false,
      isVerificationInProgress: false,
      isDeactivated: false,
    })

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].type).toBe(StartVerificationNotification)
  })

  it('dismissing StartVerificationNotification removes it from the list', () => {
    jest.mocked(VerificationStatusModule.useVerificationStatus).mockReturnValue({
      needsVerification: true,
      isVerified: false,
      isVerificationInProgress: false,
      isDeactivated: false,
    })

    const { result } = renderHook(() => useCustomNotifications())
    expect(result.current.customNotifications).toHaveLength(1)

    act(() => {
      result.current.dismissCustomNotification(CustomNotificationId.BCSCStartVerification)
    })

    expect(result.current.customNotifications).toHaveLength(0)
  })

  it('does not remove CardExpiryNotification when dismissed (non-dismissible)', () => {
    jest.mocked(useStore).mockReturnValue(makeStore({ showAccountExpiryNotification: true }) as any)

    const { result } = renderHook(() => useCustomNotifications())

    act(() => {
      result.current.dismissCustomNotification(CustomNotificationId.AccountExpired)
    })

    expect(result.current.customNotifications).toHaveLength(1)
  })

  it('returns all active notifications together', () => {
    jest
      .mocked(useStore)
      .mockReturnValue(makeStore({ showAccountExpiryNotification: true, showCardRenewalNotification: true }) as any)
    jest.mocked(VerificationStatusModule.useVerificationStatus).mockReturnValue({
      needsVerification: true,
      isVerified: false,
      isVerificationInProgress: false,
      isDeactivated: false,
    })

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(3)
    expect(result.current.customNotifications[0].type).toBe(CardExpiryNotification)
    expect(result.current.customNotifications[1].type).toBe(CardRenewalNotification)
    expect(result.current.customNotifications[2].type).toBe(StartVerificationNotification)
  })
})

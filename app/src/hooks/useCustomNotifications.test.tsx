import { HomeNotice, HomeNoticeType } from '@/bcsc-theme/state/home/home-notice'
import { renderHook } from '@testing-library/react-native'
import { useCustomNotifications } from './useCustomNotifications'

const mockUseHomeNotice = jest.fn<HomeNotice, []>()

jest.mock('@/bcsc-theme/state/home/useHomeNotice', () => ({
  useHomeNotice: () => mockUseHomeNotice(),
}))

jest.mock('@/bcsc-theme/features/notifications/VerifiedNotification', () => 'VerifiedNotification')
jest.mock('@/bcsc-theme/features/notifications/CancelledReviewNotification', () => 'CancelledReviewNotification')
jest.mock('@/bcsc-theme/features/notifications/PendingReviewNotification', () => 'PendingReviewNotification')
jest.mock('@/bcsc-theme/features/notifications/StartVerificationNotification', () => 'StartVerificationNotification')
jest.mock(
  '@/bcsc-theme/features/notifications/ContinueVerificationNotification',
  () => 'ContinueVerificationNotification'
)
jest.mock('@/bcsc-theme/features/notifications/CardExpiryNotification', () => 'CardExpiryNotification')
jest.mock('@/bcsc-theme/features/notifications/CardRenewalNotification', () => 'CardRenewalNotification')

const EXPIRES_AT = new Date('2026-10-22T00:00:00.000Z')

describe('useCustomNotifications', () => {
  it('returns no notifications when there is no notice', () => {
    mockUseHomeNotice.mockReturnValue({ type: HomeNoticeType.None })

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toEqual([])
  })

  it.each([
    [HomeNoticeType.BCSCVerified, 'VerifiedNotification'],
    [HomeNoticeType.BCSCCancelledReview, 'CancelledReviewNotification'],
    [HomeNoticeType.BCSCPendingReview, 'PendingReviewNotification'],
    [HomeNoticeType.BCSCContinueVerification, 'ContinueVerificationNotification'],
    [HomeNoticeType.BCSCStartVerification, 'StartVerificationNotification'],
    [HomeNoticeType.AccountExpired, 'CardExpiryNotification'],
  ] as const)('maps %s to one %s keyed by the notice type', (type, component) => {
    mockUseHomeNotice.mockReturnValue({ type })

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].type).toBe(component)
    expect(result.current.customNotifications[0].key).toBe(type)
  })

  it('passes the expiry date to the renewal notice', () => {
    mockUseHomeNotice.mockReturnValue({ type: HomeNoticeType.AccountRenewalAvailable, expiresAt: EXPIRES_AT })

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].type).toBe('CardRenewalNotification')
    expect(result.current.customNotifications[0].key).toBe(HomeNoticeType.AccountRenewalAvailable)
    expect(result.current.customNotifications[0].props.expiresAt).toBe(EXPIRES_AT)
  })
})

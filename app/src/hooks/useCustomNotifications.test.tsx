import { act, renderHook } from '@testing-library/react-native'
import { CustomNotificationId, useCustomNotifications } from './useCustomNotifications'

const mockUseStore = jest.fn()
const mockUseVerificationStatus = jest.fn()

jest.mock('@bifold/core', () => ({
  useStore: () => mockUseStore(),
}))

jest.mock('@/bcsc-theme/hooks/useVerificationStatus', () => ({
  useVerificationStatus: () => mockUseVerificationStatus(),
}))

jest.mock('@/bcsc-theme/features/notifications/VerifiedNotification', () => 'VerifiedNotification')
jest.mock('@/bcsc-theme/features/notifications/CancelledReviewNotification', () => 'CancelledReviewNotification')
jest.mock('@/bcsc-theme/features/notifications/PendingReviewNotification', () => 'PendingReviewNotification')
jest.mock('@/bcsc-theme/features/notifications/StartVerificationNotification', () => 'StartVerificationNotification')

const buildStore = (bcscSecure: object) => [{ bcscSecure }, jest.fn()]

const baseVerificationStatus = {
  needsVerification: false,
  isVerified: false,
  isVerificationInProgress: false,
  isDeactivated: false,
}

describe('useCustomNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseVerificationStatus.mockReturnValue(baseVerificationStatus)
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: null, verificationRequestId: null }))
  })

  it('returns an empty array when there is nothing to show', () => {
    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(0)
  })

  it('returns VerifiedNotification when status is verified', () => {
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'verified', verificationRequestId: 'req-1' }))

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCVerified)
  })

  it('returns CancelledReviewNotification when status is cancelled', () => {
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'cancelled', verificationRequestId: 'req-1' }))

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCCancelledReview)
  })

  it('returns PendingReviewNotification when status is pending', () => {
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'pending', verificationRequestId: 'req-1' }))

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCPendingReview)
  })

  describe('StartVerificationNotification', () => {
    beforeEach(() => {
      mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, needsVerification: true })
      mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: null, verificationRequestId: null }))
    })

    it('is shown when needsVerification is true and there is no pending request', () => {
      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCStartVerification)
    })

    it('is not shown when a verificationRequestId exists', () => {
      mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: null, verificationRequestId: 'req-1' }))

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(0)
    })

    it('is hidden after dismissCustomNotification is called', () => {
      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)

      act(() => {
        result.current.dismissCustomNotification(CustomNotificationId.BCSCStartVerification)
      })

      expect(result.current.customNotifications).toHaveLength(0)
    })

    it('dismissing an unrelated id does not hide the notification', () => {
      const { result } = renderHook(() => useCustomNotifications())

      act(() => {
        result.current.dismissCustomNotification(CustomNotificationId.BCSCVerified)
      })

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCStartVerification)
    })
  })

  it('verified status takes priority over needsVerification', () => {
    mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, needsVerification: true })
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'verified', verificationRequestId: null }))

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCVerified)
  })
})

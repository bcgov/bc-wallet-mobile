import { renderHook } from '@testing-library/react-native'
import { CustomNotificationId, useCustomNotifications } from './useCustomNotifications'

const mockUseStore = jest.fn()
const mockUseVerificationStatus = jest.fn()
const mockComputeSetupStepCompletion = jest.fn()

jest.mock('@bifold/core', () => ({
  useStore: () => mockUseStore(),
}))

jest.mock('@/bcsc-theme/hooks/useVerificationStatus', () => ({
  useVerificationStatus: () => mockUseVerificationStatus(),
}))

jest.mock('@/bcsc-theme/utils/setup-step-completion', () => ({
  computeSetupStepCompletion: (...args: unknown[]) => mockComputeSetupStepCompletion(...args),
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

const buildStore = (bcscSecure: object, bcsc: object = {}) => [
  { bcscSecure, bcsc: { showAccountExpiryNotification: false, showCardRenewalNotification: false, ...bcsc } },
  jest.fn(),
]

const baseVerificationStatus = {
  needsVerification: false,
  isVerified: false,
  isVerificationInProgress: false,
  isDeactivated: false,
}

const buildIdStepCompletion = (idCompleted: boolean) => ({
  id: {
    completed: idCompleted,
    focused: !idCompleted,
    nonBcscNeedsAdditionalCard: false,
    nonPhotoBcscNeedsAdditionalCard: false,
  },
  address: { completed: false, focused: false },
  email: { completed: false, focused: false },
  verify: { completed: false, focused: false },
  transfer: { completed: false, focused: false },
  currentStep: idCompleted ? null : ('id' as const),
  allCompleted: false,
})

describe('useCustomNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseVerificationStatus.mockReturnValue(baseVerificationStatus)
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: null, verificationRequestId: null }))
    mockComputeSetupStepCompletion.mockReturnValue(buildIdStepCompletion(false))
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
  })

  describe('ContinueVerificationNotification', () => {
    beforeEach(() => {
      mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, needsVerification: true })
      mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: null, verificationRequestId: null }))
      mockComputeSetupStepCompletion.mockReturnValue(buildIdStepCompletion(true))
    })

    it('is shown when needsVerification is true and id step is completed', () => {
      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCContinueVerification)
    })

    it('is not shown when id step is not yet completed (StartVerification shown instead)', () => {
      mockComputeSetupStepCompletion.mockReturnValue(buildIdStepCompletion(false))

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCStartVerification)
    })

    it('is not shown when there is no needsVerification', () => {
      mockUseVerificationStatus.mockReturnValue(baseVerificationStatus)

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(0)
    })

    it('verified status takes priority over ContinueVerification', () => {
      mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'verified', verificationRequestId: null }))

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCVerified)
    })
  })

  it('verified status takes priority over needsVerification', () => {
    mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, needsVerification: true })
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'verified', verificationRequestId: null }))

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCVerified)
  })

  describe('CardExpiryNotification', () => {
    it('is shown when showAccountExpiryNotification is true', () => {
      mockUseStore.mockReturnValue(
        buildStore(
          { verificationRequestStatus: null, verificationRequestId: null },
          { showAccountExpiryNotification: true }
        )
      )

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.AccountExpired)
    })

    it('takes priority over CardRenewalNotification when both are true', () => {
      mockUseStore.mockReturnValue(
        buildStore(
          { verificationRequestStatus: null, verificationRequestId: null },
          { showAccountExpiryNotification: true, showCardRenewalNotification: true }
        )
      )

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.AccountExpired)
    })

    it('is not shown when verification status takes priority', () => {
      mockUseStore.mockReturnValue(
        buildStore(
          { verificationRequestStatus: 'verified', verificationRequestId: null },
          { showAccountExpiryNotification: true }
        )
      )

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCVerified)
    })
  })

  describe('CardRenewalNotification', () => {
    it('is shown when showCardRenewalNotification is true and showAccountExpiryNotification is false', () => {
      mockUseStore.mockReturnValue(
        buildStore(
          { verificationRequestStatus: null, verificationRequestId: null },
          { showCardRenewalNotification: true }
        )
      )

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.AccountRenewalAvailable)
    })

    it('is not shown when needsVerification takes priority', () => {
      mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, needsVerification: true })
      mockUseStore.mockReturnValue(
        buildStore(
          { verificationRequestStatus: null, verificationRequestId: null },
          { showCardRenewalNotification: true }
        )
      )

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCStartVerification)
    })
  })
})

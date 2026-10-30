import { AccountPhaseType } from '@/bcsc-theme/state/account/account-phase'
import { renderHook } from '@testing-library/react-native'
import { CustomNotificationId, useCustomNotifications } from './useCustomNotifications'

const mockUseStore = jest.fn()
const mockUseVerificationStatus = jest.fn()
const mockComputeSetupStepCompletion = jest.fn()
const mockUseAccountPhase = jest.fn()
const mockIsUserVerified = jest.fn()

jest.mock('@bifold/core', () => ({
  useStore: () => mockUseStore(),
}))

jest.mock('@/bcsc-theme/hooks/useVerificationStatus', () => ({
  useVerificationStatus: () => mockUseVerificationStatus(),
}))

jest.mock('@/bcsc-theme/state/account/useAccountPhase', () => ({
  useAccountPhase: () => mockUseAccountPhase(),
}))

jest.mock('@/bcsc-theme/utils/bcsc-credential', () => ({
  isUserVerified: (...args: unknown[]) => mockIsUserVerified(...args),
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

const buildStore = (bcscSecure: object) => [{ bcscSecure, bcsc: {} }, jest.fn()]

const expiresAt = new Date('2026-10-22T00:00:00.000Z')

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
    mockUseAccountPhase.mockReturnValue({ phase: AccountPhaseType.None })
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: null, verificationRequestId: null }))
    mockComputeSetupStepCompletion.mockReturnValue(buildIdStepCompletion(false))
    mockIsUserVerified.mockReturnValue(false)
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

  it('drops VerifiedNotification once the user is verified, even if the status was never cleared', () => {
    // MainStack stops registering VerificationSuccess on the `verified` flip, so the card's CTA would go nowhere
    mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, isVerified: true })
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'verified', verificationRequestId: 'req-1' }))

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(0)
  })

  it('falls through to the notifications of a verified user when the verified status is stale', () => {
    mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, isVerified: true })
    mockUseAccountPhase.mockReturnValue({ phase: AccountPhaseType.Expired })
    mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'verified', verificationRequestId: 'req-1' }))

    const { result } = renderHook(() => useCustomNotifications())

    expect(result.current.customNotifications).toHaveLength(1)
    expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.AccountExpired)
  })

  describe('a device IAS has verified that has no credential record (isUserVerified without verified)', () => {
    // Tokens IAS issued are on the device, from an account transfer or a finish step whose credential
    // write failed, but the finish step hasn't persisted the record the routing keys on
    beforeEach(() => {
      mockIsUserVerified.mockReturnValue(true)
    })

    it('shows VerifiedNotification so the user can finish setup, even with no request status', () => {
      mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, needsVerification: true })
      mockComputeSetupStepCompletion.mockReturnValue(buildIdStepCompletion(true))

      const { result } = renderHook(() => useCustomNotifications())

      expect(mockIsUserVerified).toHaveBeenCalledWith(mockUseStore()[0].bcscSecure)
      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCVerified)
    })

    it('takes priority over a cancelled request status', () => {
      mockUseStore.mockReturnValue(
        buildStore({ verificationRequestStatus: 'cancelled', verificationRequestId: 'req-1' })
      )

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCVerified)
    })

    it('is dropped once the record is persisted, like the request status', () => {
      mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, isVerified: true })

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(0)
    })

    it('is not shown once the refresh token has expired, since finishing needs a token refresh', () => {
      // The state hydration leaves: the refresh was skipped, so no record was restored
      mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, needsVerification: true })
      mockUseStore.mockReturnValue(
        buildStore({ verificationRequestStatus: null, verificationRequestId: null, refreshTokenExpired: true })
      )

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCStartVerification)
    })
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
    it('is shown when the account phase is expired', () => {
      mockUseAccountPhase.mockReturnValue({ phase: AccountPhaseType.Expired })

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.AccountExpired)
    })

    it('is not shown when verification status takes priority', () => {
      mockUseAccountPhase.mockReturnValue({ phase: AccountPhaseType.Expired })
      mockUseStore.mockReturnValue(buildStore({ verificationRequestStatus: 'verified', verificationRequestId: null }))

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCVerified)
    })
  })

  describe('CardRenewalNotification', () => {
    it('is shown with the expiry date when the account phase is expiringSoon', () => {
      mockUseAccountPhase.mockReturnValue({ phase: AccountPhaseType.ExpiringSoon, expiresAt })

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(1)
      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.AccountRenewalAvailable)
      expect(result.current.customNotifications[0].props.expiresAt).toBe(expiresAt)
    })

    it.each([
      ['active', { phase: AccountPhaseType.Active, expiresAt }],
      ['unknown', { phase: AccountPhaseType.Unknown }],
      ['none', { phase: AccountPhaseType.None }],
    ])('shows nothing when the account phase is %s', (_name, phase) => {
      mockUseAccountPhase.mockReturnValue(phase)
      mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, isVerified: true })

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications).toHaveLength(0)
    })

    it('is not shown when needsVerification takes priority', () => {
      mockUseAccountPhase.mockReturnValue({ phase: AccountPhaseType.ExpiringSoon, expiresAt })
      mockUseVerificationStatus.mockReturnValue({ ...baseVerificationStatus, needsVerification: true })

      const { result } = renderHook(() => useCustomNotifications())

      expect(result.current.customNotifications[0].key).toBe(CustomNotificationId.BCSCStartVerification)
    })
  })
})

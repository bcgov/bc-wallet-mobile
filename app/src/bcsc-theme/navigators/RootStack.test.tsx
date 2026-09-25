import { ErrorRegistry } from '@/errors'
import { VerificationStatus } from '@/store'
import * as Bifold from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import * as useInitializeAccountStatusModule from '../api/hooks/useInitializeAccountStatus'
import { useFcmService } from '../features/fcm'
import { toAppError } from '../utils/native-error-map'
import BCSCRootStack from './RootStack'

jest.mock('@bifold/core')
jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: () => ({ emitErrorModal: jest.fn() }),
}))
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
  useNavigationContainer: () => ({ isNavigationReady: true }),
}))
jest.mock('../api/hooks/useInitializeAccountStatus')
jest.mock('../api/hooks/useThirdPartyKeyboardWarning', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('../hooks/useBCSCApiClient', () => ({
  useBCSCApiClientState: () => ({ isClientReady: true }),
}))
jest.mock('../features/fcm', () => ({
  useFcmService: jest.fn(),
  FcmServiceProvider: ({ children }: any) => children,
}))
jest.mock('../hooks/useSystemChecks', () => ({
  SystemCheckScope: { STARTUP: 'STARTUP' },
  useSystemChecks: jest.fn(),
}))
jest.mock('../contexts/BCSCLoadingContext', () => ({
  LoadingScreen: () => 'LoadingScreen',
}))
jest.mock('./AuthStack', () => ({
  __esModule: true,
  default: () => 'AuthStack',
}))
const mockMainStackRender = jest.fn()
jest.mock('./MainStack', () => ({
  __esModule: true,
  default: () => {
    mockMainStackRender()
    return 'MainStack'
  },
}))
jest.mock('./OnboardingStack', () => ({
  __esModule: true,
  default: () => 'OnboardingStack',
}))
// Counts mounts, not renders: a remount is what re-runs VerifyStack's resume-step routing
const mockVerifyStackMount = jest.fn()
jest.mock('./VerifyStack', () => {
  const { useEffect } = jest.requireActual('react')
  const VerifyStackMock = () => {
    useEffect(() => {
      mockVerifyStackMount()
    }, [])
    return 'VerifyStack'
  }
  return { __esModule: true, default: VerifyStackMock }
})
jest.mock('../contexts/BCSCActivityContext', () => ({
  BCSCActivityProvider: ({ children }: any) => children,
}))
jest.mock('../contexts/BCSCAccountContext', () => ({
  BCSCAccountProvider: ({ children }: any) => children,
  useAccount: () => ({ account: null }),
}))
jest.mock('../contexts/BCSCIdTokenContext', () => ({
  BCSCIdTokenProvider: ({ children }: any) => children,
}))
jest.mock('../features/agent/BCSCAgentProvider', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}))

const mockUseServerStatus = jest.fn()
jest.mock('../contexts/ServerStatusContext', () => ({
  useServerStatus: () => mockUseServerStatus(),
}))

const mockStore = (overrides: Record<string, any> = {}) => ({
  stateLoaded: true,
  bcsc: { hasAccount: false },
  bcscSecure: { verified: false },
  authentication: { didAuthenticate: false },
  ...overrides,
})

const mockProcessPendingChallenges = jest.fn()

describe('BCSCRootStack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })

    const mockLoadState = jest.fn()
    jest.mocked(Bifold.useServices).mockReturnValue([mockLoadState] as any)
    jest.mocked(useInitializeAccountStatusModule.useInitializeAccountStatus).mockReturnValue({
      initializingAccount: false,
    })
    jest.mocked(useFcmService).mockReturnValue({
      service: {},
      viewModel: { processPendingChallenges: mockProcessPendingChallenges, setCardExpired: jest.fn() },
    } as any)
  })

  it('renders LoadingScreen when stateLoaded is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ stateLoaded: false }), mockDispatch] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('LoadingScreen')
  })

  it('renders LoadingScreen when initializingAccount is true', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), mockDispatch] as any)
    jest.mocked(useInitializeAccountStatusModule.useInitializeAccountStatus).mockReturnValue({
      initializingAccount: true,
    })

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('LoadingScreen')
  })

  it('renders LoadingScreen when isClientReady is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), mockDispatch] as any)

    jest.requireMock('../hooks/useBCSCApiClient').useBCSCApiClientState = () => ({
      isClientReady: false,
    })

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('LoadingScreen')

    // Reset for other tests
    jest.requireMock('../hooks/useBCSCApiClient').useBCSCApiClientState = () => ({
      isClientReady: true,
    })
  })

  it('renders LoadingScreen when isNavigationReady is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), mockDispatch] as any)

    jest.requireMock('@/contexts/NavigationContainerContext').useNavigationContainer = () => ({
      isNavigationReady: false,
    })

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('LoadingScreen')

    // Reset for other tests
    jest.requireMock('@/contexts/NavigationContainerContext').useNavigationContainer = () => ({
      isNavigationReady: true,
    })
  })

  it('renders OnboardingStack when hasAccount is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ bcsc: { hasAccount: false } }), mockDispatch] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('OnboardingStack')
  })

  it('renders AuthStack when hasAccount is true and didAuthenticate is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: false },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('AuthStack')
  })

  it('renders VerifyStack when authenticated and verification in progress', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false, verifiedStatus: VerificationStatus.IN_PROGRESS },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('VerifyStack')
  })

  it('renders MainStack when authenticated and verified', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: true },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('MainStack')
  })

  it('renders VerifyStack when sessionRecoveryRequired is set, overriding the verified→Home routing', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: true },
        // verified:true would normally route to MainStack — recovery must take precedence.
        // (VerifyStack starts on the SessionRecovery screen when sessionRecoveryRequired is set.)
        bcscSecure: { verified: true, sessionRecoveryRequired: true },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('VerifyStack')
  })

  it('renders MainStack as fallback when verified is undefined', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        // verificationSkipped:true is what the load-time migration stamps on every already-onboarded
        // install, so this "returning user" case never hits the undefined-means-show-the-prompt gate.
        bcsc: { hasAccount: true, verificationSkipped: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: undefined },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('MainStack')
  })

  it('renders VerifyStack (which opens on the verify prompt) when onboarding completes', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: false },
        authentication: { didAuthenticate: false },
        bcscSecure: { verified: false },
      }),
      mockDispatch,
    ] as any)

    const { toJSON, rerender } = render(<BCSCRootStack />)
    expect(toJSON()).toBe('OnboardingStack')

    // Creating the PIN completes onboarding: SUCCESSFUL_AUTH sets both flags at once.
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false },
      }),
      mockDispatch,
    ] as any)
    rerender(<BCSCRootStack />)

    expect(toJSON()).toBe('VerifyStack')
  })

  it('renders MainStack when an existing unverified account unlocks', () => {
    const mockDispatch = jest.fn()
    // The user is returning: the load-time migration stamped verificationSkipped:true on their
    // already-onboarded state, so the prompt has passed them by. They start verification from the
    // MainStack instead.
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true, verificationSkipped: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('MainStack')
  })

  describe('verificationSkipped routing', () => {
    const authedUnverified = (
      verificationSkipped: boolean | undefined,
      verifiedStatus = VerificationStatus.UNVERIFIED
    ) =>
      mockStore({
        bcsc: { hasAccount: true, verificationSkipped },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false, verifiedStatus },
      })

    it('shows the verify prompt (VerifyStack) when verificationSkipped is undefined', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(undefined), mockDispatch] as any)

      const { toJSON } = render(<BCSCRootStack />)

      expect(toJSON()).toBe('VerifyStack')
      // "not answered yet" — the prompt records the choice; no resume dispatch here.
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bcsc/updateSecureVerifiedStatus' })
      )
    })

    it('routes a skipped (true) unverified user straight to MainStack', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(true), mockDispatch] as any)

      const { toJSON } = render(<BCSCRootStack />)

      expect(toJSON()).toBe('MainStack')
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bcsc/updateSecureVerifiedStatus' })
      )
    })

    it('re-enters verification on a cold start when verificationSkipped is false and unfinished', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(false), mockDispatch] as any)

      const { toJSON, rerender } = render(<BCSCRootStack />)

      // The one-shot effect restores IN_PROGRESS so VerifyStack takes over.
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bcsc/updateSecureVerifiedStatus',
        payload: [VerificationStatus.IN_PROGRESS],
      })

      // Simulate that dispatch landing in the store.
      jest
        .mocked(Bifold.useStore)
        .mockReturnValue([authedUnverified(false, VerificationStatus.IN_PROGRESS), mockDispatch] as any)
      rerender(<BCSCRootStack />)

      expect(toJSON()).toBe('VerifyStack')
    })

    it('only re-enters verification once per session (a later re-render does not re-dispatch)', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(false), mockDispatch] as any)

      const { rerender } = render(<BCSCRootStack />)
      expect(mockDispatch).toHaveBeenCalledTimes(1)

      // useLeaveVerification has moved status back out of IN_PROGRESS to show Home for the rest of
      // the session; re-rendering in that state must not pull the user back into VerifyStack.
      rerender(<BCSCRootStack />)
      expect(mockDispatch).toHaveBeenCalledTimes(1)
    })

    it('holds the loading screen until the IAS status is known for a would-resume user', () => {
      const mockDispatch = jest.fn()
      mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: false })
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(false), mockDispatch] as any)

      const { toJSON } = render(<BCSCRootStack />)

      expect(toJSON()).toBe('LoadingScreen')
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bcsc/updateSecureVerifiedStatus' })
      )
    })

    it('falls back to the verify prompt (not the resume step) and does not resume during an outage', () => {
      const mockDispatch = jest.fn()
      mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(false), mockDispatch] as any)

      const { toJSON } = render(<BCSCRootStack />)

      expect(toJSON()).toBe('VerifyStack')
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bcsc/updateSecureVerifiedStatus' })
      )
    })

    describe('after the startup resume', () => {
      const resumeDispatch = { type: 'bcsc/updateSecureVerifiedStatus', payload: [VerificationStatus.IN_PROGRESS] }

      /**
       * Cold-start harness whose dispatch lands in the mocked store. The render the resume effect
       * triggers then sees IN_PROGRESS together with the evaluated flag, as React batches the two in
       * the app. `apply` plays a store change made elsewhere, e.g. useLeaveVerification's UNVERIFIED.
       */
      const renderColdStart = (initial: Record<string, any>) => {
        let state = initial
        const dispatch = jest.fn((action: { type: string; payload?: any[] }) => {
          if (action.type === 'bcsc/updateSecureVerifiedStatus') {
            state = { ...state, bcscSecure: { ...state.bcscSecure, verifiedStatus: action.payload?.[0] } }
          }
        })
        jest.mocked(Bifold.useStore).mockImplementation(() => [state, dispatch] as any)
        const utils = render(<BCSCRootStack />)
        const apply = (patch: (current: Record<string, any>) => Record<string, any>) => {
          state = patch(state)
          utils.rerender(<BCSCRootStack />)
        }
        return { ...utils, dispatch, apply }
      }

      const withStatus = (verifiedStatus: VerificationStatus) => (current: Record<string, any>) => ({
        ...current,
        bcscSecure: { ...current.bcscSecure, verifiedStatus },
      })

      it('mounts VerifyStack once on a cold-start resume, never showing Home in between', () => {
        const { toJSON, dispatch } = renderColdStart(authedUnverified(false))

        expect(dispatch).toHaveBeenCalledWith(resumeDispatch)
        expect(toJSON()).toBe('VerifyStack')
        expect(mockVerifyStackMount).toHaveBeenCalledTimes(1)
        expect(mockMainStackRender).not.toHaveBeenCalled()
      })

      it('returns a resumed user to MainStack when they leave verification', () => {
        const { toJSON, dispatch, apply } = renderColdStart(authedUnverified(false))
        expect(toJSON()).toBe('VerifyStack')

        // Back arrow / "Back to home": useLeaveVerification moves status back out of IN_PROGRESS.
        apply(withStatus(VerificationStatus.UNVERIFIED))

        expect(toJSON()).toBe('MainStack')
        // Leaving must not read as a resume still pending, or the user is pulled straight back.
        expect(dispatch).toHaveBeenCalledTimes(1)
      })

      it('remounts VerifyStack when a restart resets the status and re-enters verification', () => {
        const { toJSON, apply } = renderColdStart(authedUnverified(false))
        expect(mockVerifyStackMount).toHaveBeenCalledTimes(1)

        // useVerificationReset clears to UNVERIFIED, then continueVerificationProcess sets IN_PROGRESS.
        apply(withStatus(VerificationStatus.UNVERIFIED))
        expect(toJSON()).toBe('MainStack')
        apply(withStatus(VerificationStatus.IN_PROGRESS))

        expect(toJSON()).toBe('VerifyStack')
        // A fresh mount is what re-runs the resume-step routing, landing on the first step.
        expect(mockVerifyStackMount).toHaveBeenCalledTimes(2)
      })

      it('lets a user who skipped earlier start from the Home card and leave again', () => {
        const { toJSON, dispatch, apply } = renderColdStart(authedUnverified(true))
        expect(toJSON()).toBe('MainStack')
        expect(dispatch).not.toHaveBeenCalled()

        // "Start verification" on the Home card: verificationSkipped=false and IN_PROGRESS together.
        apply((current) => ({
          ...withStatus(VerificationStatus.IN_PROGRESS)(current),
          bcsc: { ...current.bcsc, verificationSkipped: false },
        }))
        expect(toJSON()).toBe('VerifyStack')

        apply(withStatus(VerificationStatus.UNVERIFIED))

        expect(toJSON()).toBe('MainStack')
        expect(dispatch).not.toHaveBeenCalled()
      })

      it('resumes once an outage that blocked the cold-start resume clears', () => {
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        const { toJSON, dispatch, rerender } = renderColdStart(authedUnverified(false))
        expect(toJSON()).toBe('VerifyStack')
        expect(dispatch).not.toHaveBeenCalled()

        mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })
        rerender(<BCSCRootStack />)

        expect(dispatch).toHaveBeenCalledTimes(1)
        expect(dispatch).toHaveBeenCalledWith(resumeDispatch)
        expect(toJSON()).toBe('VerifyStack')
      })

      it('keeps a user who left on MainStack when an outage begins later in the session', () => {
        const { toJSON, apply, rerender } = renderColdStart(authedUnverified(false))
        apply(withStatus(VerificationStatus.UNVERIFIED))
        expect(toJSON()).toBe('MainStack')

        // The outage fallback prompt is a cold-start affordance; mid-session the banner covers it.
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        rerender(<BCSCRootStack />)

        expect(toJSON()).toBe('MainStack')
      })
    })
  })

  it('calls loadState when stateLoaded is false', () => {
    const mockDispatch = jest.fn()
    const mockLoadState = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ stateLoaded: false }), mockDispatch] as any)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLoadState] as any)

    render(<BCSCRootStack />)

    expect(mockLoadState).toHaveBeenCalledWith(mockDispatch)
  })

  it('does not call loadState when stateLoaded is true', () => {
    const mockDispatch = jest.fn()
    const mockLoadState = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ stateLoaded: true }), mockDispatch] as any)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLoadState] as any)

    render(<BCSCRootStack />)

    expect(mockLoadState).not.toHaveBeenCalled()
  })

  it('calls emitErrorModal when loadState throws', () => {
    const mockDispatch = jest.fn()
    const mockError = new Error('load failed')
    const mockLoadState = jest.fn().mockImplementation(() => {
      throw mockError
    })
    const mockEmitErrorModal = jest.fn()

    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ stateLoaded: false }), mockDispatch] as any)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLoadState] as any)

    jest.requireMock('@/contexts/ErrorAlertContext').useErrorAlert = () => ({
      emitErrorModal: mockEmitErrorModal,
    })

    render(<BCSCRootStack />)

    expect(mockEmitErrorModal).toHaveBeenCalledWith(
      'Error.Problem',
      'Error.ProblemDescription',
      toAppError(mockError, ErrorRegistry.STATE_LOAD_ERROR)
    )
  })

  it('processPendingChallenges is called when api client is ready', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), mockDispatch] as any)

    render(<BCSCRootStack />)

    expect(mockProcessPendingChallenges).toHaveBeenCalledTimes(1)
  })

  it('processPendingChallenges is not called when api client is not ready', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), mockDispatch] as any)

    jest.requireMock('../hooks/useBCSCApiClient').useBCSCApiClientState = () => ({
      isClientReady: false,
    })

    render(<BCSCRootStack />)

    expect(mockProcessPendingChallenges).not.toHaveBeenCalled()

    // Reset for other tests
    jest.requireMock('../hooks/useBCSCApiClient').useBCSCApiClientState = () => ({
      isClientReady: true,
    })
  })
})

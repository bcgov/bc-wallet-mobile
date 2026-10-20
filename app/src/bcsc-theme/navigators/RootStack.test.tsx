import { ErrorRegistry } from '@/errors'
import { VerificationStatus } from '@/store'
import * as Bifold from '@bifold/core'
import { act, render } from '@testing-library/react-native'
import React from 'react'
import * as useInitializeAccountStatusModule from '../api/hooks/useInitializeAccountStatus'
import { useFcmService } from '../features/fcm'
import { toAppError } from '../utils/native-error-map'
import BCSCRootStack from './RootStack'

let mockAccount: { account_expiration_date: Date } | null = null
const mockIsClientReady = jest.fn()
const mockIsNavigationReady = jest.fn()
const mockEmitErrorModal = jest.fn()

jest.mock('@bifold/core')
jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: () => ({ emitErrorModal: mockEmitErrorModal }),
}))
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
  useNavigationContainer: () => ({ isNavigationReady: mockIsNavigationReady() }),
}))
jest.mock('../api/hooks/useInitializeAccountStatus')
jest.mock('../api/hooks/useThirdPartyKeyboardWarning', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('../hooks/useBCSCApiClient', () => ({
  useBCSCApiClientState: () => ({ isClientReady: mockIsClientReady() }),
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
  LoadingScreen: 'LoadingScreen',
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
// Records every render's props, so a test can answer the prompt the way VerifyPromptScreen would
const mockVerifyStackProps = jest.fn()
jest.mock('./VerifyStack', () => {
  const { useEffect } = jest.requireActual('react')
  const VerifyStackMock = (props: any) => {
    mockVerifyStackProps(props)
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
  useAccount: () => ({ account: mockAccount }),
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
const mockSetCardExpired = jest.fn()

// RootStack asks for the state loader; the real FcmCardExpirySync asks for the logger
const mockLogger = { info: jest.fn() }
const mockServices = (loadState: jest.Mock) =>
  jest
    .mocked(Bifold.useServices)
    .mockImplementation(((tokens: string[]) =>
      tokens.map((token) => (token === Bifold.TOKENS.UTIL_LOGGER ? mockLogger : loadState))) as any)

describe('BCSCRootStack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAccount = null
    mockIsClientReady.mockReturnValue(true)
    mockIsNavigationReady.mockReturnValue(true)
    mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })

    const mockLoadState = jest.fn()
    mockServices(mockLoadState)
    jest.mocked(useInitializeAccountStatusModule.useInitializeAccountStatus).mockReturnValue({
      initializingAccount: false,
    })
    jest.mocked(useFcmService).mockReturnValue({
      service: {},
      viewModel: { processPendingChallenges: mockProcessPendingChallenges, setCardExpired: mockSetCardExpired },
    } as any)
  })

  it('renders LoadingScreen when stateLoaded is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ stateLoaded: false }), mockDispatch] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toMatchObject({ type: 'LoadingScreen', props: { message: 'BCSC.Loading.AppStartup' } })
  })

  it('renders LoadingScreen when initializingAccount is true', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), mockDispatch] as any)
    jest.mocked(useInitializeAccountStatusModule.useInitializeAccountStatus).mockReturnValue({
      initializingAccount: true,
    })

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toMatchObject({ type: 'LoadingScreen', props: { message: 'BCSC.Loading.AppStartup' } })
  })

  it('renders LoadingScreen when isClientReady is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), mockDispatch] as any)

    mockIsClientReady.mockReturnValue(false)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toMatchObject({ type: 'LoadingScreen', props: { message: 'BCSC.Loading.AppStartup' } })
  })

  it('renders LoadingScreen when isNavigationReady is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), mockDispatch] as any)

    mockIsNavigationReady.mockReturnValue(false)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toMatchObject({ type: 'LoadingScreen', props: { message: 'BCSC.Loading.AppStartup' } })
  })

  it.each<[string, Record<string, any>, string]>([
    ['OnboardingStack when hasAccount is false', { bcsc: { hasAccount: false } }, 'OnboardingStack'],
    [
      'AuthStack when hasAccount is true and didAuthenticate is false',
      { bcsc: { hasAccount: true }, authentication: { didAuthenticate: false } },
      'AuthStack',
    ],
    [
      'VerifyStack when authenticated and verification in progress',
      {
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false, verifiedStatus: VerificationStatus.IN_PROGRESS },
      },
      'VerifyStack',
    ],
    [
      'MainStack when authenticated and verified',
      { bcsc: { hasAccount: true }, authentication: { didAuthenticate: true }, bcscSecure: { verified: true } },
      'MainStack',
    ],
    [
      'VerifyStack when sessionRecoveryRequired is set, overriding the verified→Home routing',
      {
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: true },
        // verified:true would normally route to MainStack — recovery must take precedence.
        // (VerifyStack starts on the SessionRecovery screen when sessionRecoveryRequired is set.)
        bcscSecure: { verified: true, sessionRecoveryRequired: true },
      },
      'VerifyStack',
    ],
    [
      'MainStack when an existing unverified account unlocks',
      {
        // The user is returning: the load-time migration stamped verificationSkipped:true and
        // verificationStarted:false on their already-onboarded state, so the prompt has passed them by.
        // They start verification from the MainStack instead.
        bcsc: { hasAccount: true, verificationSkipped: true, verificationStarted: false },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false },
      },
      'MainStack',
    ],
  ])('renders %s', (_name, overrides, expectedStack) => {
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(overrides), jest.fn()] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe(expectedStack)
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

  describe('verification resume routing', () => {
    type VerificationFlags = { verificationSkipped?: boolean; verificationStarted?: boolean }
    // The prompt hasn't been answered yet (just onboarded)
    const UNANSWERED: VerificationFlags = {}
    const SKIPPED: VerificationFlags = { verificationSkipped: true, verificationStarted: false }
    const CHOSE_TO_VERIFY: VerificationFlags = { verificationSkipped: false, verificationStarted: true }
    // Skipped the prompt, then started from Home (the card, a gated tab's prompt, a renewal)
    const SKIPPED_THEN_STARTED: VerificationFlags = { verificationSkipped: true, verificationStarted: true }

    const authedUnverified = (flags: VerificationFlags, verifiedStatus = VerificationStatus.UNVERIFIED) =>
      mockStore({
        bcsc: { hasAccount: true, ...flags },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false, verifiedStatus },
      })

    it('shows the verify prompt (VerifyStack) when verificationSkipped is undefined', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(UNANSWERED), mockDispatch] as any)

      const { toJSON } = render(<BCSCRootStack />)

      expect(toJSON()).toBe('VerifyStack')
      // "not answered yet" — the prompt records the choice; no resume dispatch here.
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bcsc/updateSecureVerifiedStatus' })
      )
    })

    it('routes a user who skipped and never started verification straight to MainStack', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(SKIPPED), mockDispatch] as any)

      const { toJSON } = render(<BCSCRootStack />)

      expect(toJSON()).toBe('MainStack')
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bcsc/updateSecureVerifiedStatus' })
      )
    })

    it('re-enters verification on a cold start when it was started and is unfinished', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(CHOSE_TO_VERIFY), mockDispatch] as any)

      const { toJSON, rerender } = render(<BCSCRootStack />)

      // The one-shot effect restores IN_PROGRESS so VerifyStack takes over.
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bcsc/updateSecureVerifiedStatus',
        payload: [VerificationStatus.IN_PROGRESS],
      })

      // Simulate that dispatch landing in the store.
      jest
        .mocked(Bifold.useStore)
        .mockReturnValue([authedUnverified(CHOSE_TO_VERIFY, VerificationStatus.IN_PROGRESS), mockDispatch] as any)
      rerender(<BCSCRootStack />)

      expect(toJSON()).toBe('VerifyStack')
    })

    it('re-enters verification for a user who skipped the prompt but started verification later', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(SKIPPED_THEN_STARTED), mockDispatch] as any)

      render(<BCSCRootStack />)

      // Started is what counts, not the answer to the prompt (#4691)
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'bcsc/updateSecureVerifiedStatus',
        payload: [VerificationStatus.IN_PROGRESS],
      })
    })

    it('leaves a deactivated card on MainStack even when verification was started', () => {
      const mockDispatch = jest.fn()
      jest
        .mocked(Bifold.useStore)
        .mockReturnValue([authedUnverified(CHOSE_TO_VERIFY, VerificationStatus.DEACTIVATED), mockDispatch] as any)

      const { toJSON } = render(<BCSCRootStack />)

      // An expired or cancelled card is renewed from Home, not resumed
      expect(toJSON()).toBe('MainStack')
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('only re-enters verification once per session (a later re-render does not re-dispatch)', () => {
      const mockDispatch = jest.fn()
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(CHOSE_TO_VERIFY), mockDispatch] as any)

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
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(CHOSE_TO_VERIFY), mockDispatch] as any)

      const { toJSON } = render(<BCSCRootStack />)

      expect(toJSON()).toMatchObject({ type: 'LoadingScreen', props: { message: 'BCSC.Loading.AppStartup' } })
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bcsc/updateSecureVerifiedStatus' })
      )
    })

    it('falls back to the verify prompt (not the resume step) and does not resume during an outage', () => {
      const mockDispatch = jest.fn()
      mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
      jest.mocked(Bifold.useStore).mockReturnValue([authedUnverified(CHOSE_TO_VERIFY), mockDispatch] as any)

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
        const { toJSON, dispatch } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))

        expect(dispatch).toHaveBeenCalledWith(resumeDispatch)
        expect(toJSON()).toBe('VerifyStack')
        expect(mockVerifyStackMount).toHaveBeenCalledTimes(1)
        expect(mockMainStackRender).not.toHaveBeenCalled()
      })

      it('returns a resumed user to MainStack when they leave verification', () => {
        const { toJSON, dispatch, apply } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(toJSON()).toBe('VerifyStack')

        // Back arrow / "Back to home": useLeaveVerification moves status back out of IN_PROGRESS.
        apply(withStatus(VerificationStatus.UNVERIFIED))

        expect(toJSON()).toBe('MainStack')
        // Leaving must not read as a resume still pending, or the user is pulled straight back.
        expect(dispatch).toHaveBeenCalledTimes(1)
      })

      it('returns a first-time verifier who walked back to the prompt and skips to MainStack', () => {
        const { toJSON, dispatch, apply, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(toJSON()).toBe('VerifyStack')

        // Back from the first step replaced onto the prompt (still IN_PROGRESS). Its Skip answers the
        // prompt, records the skip and leaves the flow (useLeaveVerification) in one press.
        act(() => mockVerifyStackProps.mock.lastCall?.[0].onVerifyPromptAnswered())
        apply((current) => ({
          ...withStatus(VerificationStatus.UNVERIFIED)(current),
          bcsc: { ...current.bcsc, verificationSkipped: true },
        }))

        expect(toJSON()).toBe('MainStack')
        // Started stays set, but the resume was already evaluated: nothing pulls them back in this session.
        rerender(<BCSCRootStack />)
        expect(toJSON()).toBe('MainStack')
        expect(dispatch).toHaveBeenCalledTimes(1)
      })

      it('remounts VerifyStack when a restart resets the status and re-enters verification', () => {
        const { toJSON, apply } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
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
        const { toJSON, dispatch, apply } = renderColdStart(authedUnverified(SKIPPED))
        expect(toJSON()).toBe('MainStack')
        expect(dispatch).not.toHaveBeenCalled()

        // "Start verification" on the Home card: verificationStarted=true and IN_PROGRESS together.
        apply((current) => ({
          ...withStatus(VerificationStatus.IN_PROGRESS)(current),
          bcsc: { ...current.bcsc, verificationStarted: true },
        }))
        expect(toJSON()).toBe('VerifyStack')

        apply(withStatus(VerificationStatus.UNVERIFIED))

        // In session, leaving lands on Home; only the next cold start resumes them.
        expect(toJSON()).toBe('MainStack')
        expect(dispatch).not.toHaveBeenCalled()
      })

      it('lets a started user who skips on the outage fallback reach Home and stay there once IAS recovers', () => {
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        const { toJSON, dispatch, apply, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(toJSON()).toBe('VerifyStack')
        expect(mockVerifyStackProps).toHaveBeenLastCalledWith(expect.objectContaining({ showVerifyPrompt: true }))

        // The outage screen's Skip: VerifyPromptScreen answers the prompt, then records the skip. Started
        // stays set, so the answer alone has to settle the pending resume.
        act(() => mockVerifyStackProps.mock.lastCall?.[0].onVerifyPromptAnswered())
        apply((current) => ({ ...current, bcsc: { ...current.bcsc, verificationSkipped: true } }))

        expect(toJSON()).toBe('MainStack')

        mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })
        rerender(<BCSCRootStack />)

        expect(toJSON()).toBe('MainStack')
        expect(dispatch).not.toHaveBeenCalled()
      })

      it('resumes once an outage that blocked the cold-start resume clears', () => {
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        const { toJSON, dispatch, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(toJSON()).toBe('VerifyStack')
        expect(dispatch).not.toHaveBeenCalled()

        mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })
        rerender(<BCSCRootStack />)

        expect(dispatch).toHaveBeenCalledTimes(1)
        expect(dispatch).toHaveBeenCalledWith(resumeDispatch)
        expect(toJSON()).toBe('VerifyStack')
      })

      it('keeps a user who left on MainStack when an outage begins later in the session', () => {
        const { toJSON, apply, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        apply(withStatus(VerificationStatus.UNVERIFIED))
        expect(toJSON()).toBe('MainStack')

        // The outage fallback prompt is a cold-start affordance; mid-session the banner covers it.
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        rerender(<BCSCRootStack />)

        expect(toJSON()).toBe('MainStack')
      })

      it('offers the prompt again when the account is removed and onboarding is redone in the same session', () => {
        // Fresh install: onboarding, then the prompt once the PIN is created (SUCCESSFUL_AUTH)
        const { toJSON, dispatch, apply } = renderColdStart(mockStore())
        expect(toJSON()).toBe('OnboardingStack')
        apply((current) => ({ ...current, bcsc: { hasAccount: true }, authentication: { didAuthenticate: true } }))
        expect(toJSON()).toBe('VerifyStack')
        expect(mockVerifyStackProps.mock.lastCall?.[0].showVerifyPrompt).toBe(true)

        // Skip, then start verification from the Home card
        act(() => mockVerifyStackProps.mock.lastCall?.[0].onVerifyPromptAnswered())
        apply((current) => ({ ...current, bcsc: { ...current.bcsc, verificationSkipped: true } }))
        expect(toJSON()).toBe('MainStack')
        apply((current) => ({
          ...withStatus(VerificationStatus.IN_PROGRESS)(current),
          bcsc: { ...current.bcsc, verificationStarted: true },
        }))
        expect(toJSON()).toBe('VerifyStack')
        expect(mockVerifyStackProps.mock.lastCall?.[0].showVerifyPrompt).toBe(false)

        // Remove account (useFactoryReset): CLEAR_BCSC, CLEAR_SECURE_STATE and DID_AUTHENTICATE false, with
        // RootStack still mounted
        apply(() => mockStore())
        expect(toJSON()).toBe('OnboardingStack')

        // Onboarding again: the prompt is due like on a fresh install, and no resume is pending
        apply((current) => ({ ...current, bcsc: { hasAccount: true }, authentication: { didAuthenticate: true } }))
        expect(toJSON()).toBe('VerifyStack')
        expect(mockVerifyStackProps.mock.lastCall?.[0].showVerifyPrompt).toBe(true)
        expect(dispatch).not.toHaveBeenCalled()
      })
    })
  })

  it('calls loadState when stateLoaded is false', () => {
    const mockDispatch = jest.fn()
    const mockLoadState = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ stateLoaded: false }), mockDispatch] as any)
    mockServices(mockLoadState)

    render(<BCSCRootStack />)

    expect(mockLoadState).toHaveBeenCalledWith(mockDispatch)
  })

  it('does not call loadState when stateLoaded is true', () => {
    const mockDispatch = jest.fn()
    const mockLoadState = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ stateLoaded: true }), mockDispatch] as any)
    mockServices(mockLoadState)

    render(<BCSCRootStack />)

    expect(mockLoadState).not.toHaveBeenCalled()
  })

  it('calls emitErrorModal when loadState throws', () => {
    const mockDispatch = jest.fn()
    const mockError = new Error('load failed')
    const mockLoadState = jest.fn().mockImplementation(() => {
      throw mockError
    })

    jest.mocked(Bifold.useStore).mockReturnValue([mockStore({ stateLoaded: false }), mockDispatch] as any)
    mockServices(mockLoadState)

    render(<BCSCRootStack />)

    expect(mockEmitErrorModal).toHaveBeenCalledWith(
      'Error.Problem',
      'Error.ProblemDescription',
      toAppError(mockError, ErrorRegistry.STATE_LOAD_ERROR)
    )
  })

  it('tells FCM the card is expired when the stored refresh token expires', () => {
    const verified = { bcsc: { hasAccount: true }, authentication: { didAuthenticate: true } }
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([mockStore({ ...verified, bcscSecure: { verified: true } }), jest.fn()] as any)

    const { rerender } = render(<BCSCRootStack />)
    expect(mockSetCardExpired).toHaveBeenLastCalledWith(false)

    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([
        mockStore({ ...verified, bcscSecure: { verified: true, refreshTokenExpired: true } }),
        jest.fn(),
      ] as any)
    rerender(<BCSCRootStack />)

    expect(mockSetCardExpired).toHaveBeenLastCalledWith(true)
  })

  describe('card expiry phase logging', () => {
    const verified = { bcsc: { hasAccount: true }, authentication: { didAuthenticate: true } }
    const useVerifiedStore = (secure: object) =>
      jest
        .mocked(Bifold.useStore)
        .mockReturnValue([mockStore({ ...verified, bcscSecure: { verified: true, ...secure } }), jest.fn()] as any)
    const phaseLogs = () =>
      mockLogger.info.mock.calls.map(([message]) => message).filter((m) => String(m).includes('Card expiry phase'))

    it('logs the phase once on first render', () => {
      useVerifiedStore({})

      render(<BCSCRootStack />)

      expect(phaseLogs()).toEqual(['[RootStack] Card expiry phase: unknown'])
    })

    it('includes the days remaining when the account has an expiry date', () => {
      const inEightDays = new Date()
      inEightDays.setDate(inEightDays.getDate() + 8)
      mockAccount = { account_expiration_date: inEightDays }
      useVerifiedStore({})

      render(<BCSCRootStack />)

      expect(phaseLogs()).toEqual(['[RootStack] Card expiry phase: expiringSoon, 8 days remaining'])
    })

    it('logs again when the phase changes, and not on a re-render with the same phase', () => {
      useVerifiedStore({})
      const { rerender } = render(<BCSCRootStack />)

      useVerifiedStore({})
      rerender(<BCSCRootStack />)
      expect(phaseLogs()).toHaveLength(1)

      useVerifiedStore({ refreshTokenExpired: true })
      rerender(<BCSCRootStack />)

      expect(phaseLogs()).toEqual(['[RootStack] Card expiry phase: unknown', '[RootStack] Card expiry phase: expired'])
    })
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

    mockIsClientReady.mockReturnValue(false)

    render(<BCSCRootStack />)

    expect(mockProcessPendingChallenges).not.toHaveBeenCalled()
  })
})

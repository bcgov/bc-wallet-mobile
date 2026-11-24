import { ErrorRegistry } from '@/errors'
import * as environment from '@/utils/environment'
import { IASEnvironment } from '@/utils/environment'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { useEffect } from 'react'
import * as useInitializeAccountStatusModule from '../api/hooks/useInitializeAccountStatus'
import { useFcmService } from '../features/fcm'
import { RootPhase } from '../state/root/root-phase'
import { toAppError } from '../utils/native-error-map'
import { getRootRouteKey, IDLE_ROOT_TRANSITION, RootTransition } from './root-transition'
import { RootStackViewModel, useRootStackViewModel } from './useRootStackViewModel'

const mockIsClientReady = jest.fn()
const mockEmitErrorModal = jest.fn()
const mockIsLoading = jest.fn()
const mockUseServerStatus = jest.fn()
const mockProcessPendingChallenges = jest.fn()

jest.mock('@bifold/core')
jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: () => ({ emitErrorModal: mockEmitErrorModal }),
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
}))
jest.mock('../hooks/useSystemChecks', () => ({
  SystemCheckScope: { STARTUP: 'STARTUP' },
  useSystemChecks: jest.fn(),
}))
jest.mock('../contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: () => ({ isLoading: mockIsLoading() }),
}))
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

type RecordedRender = Pick<RootStackViewModel, 'phase' | 'inSession' | 'transition'> & { routeKey: string }
// What each commit hands the navigator: the route it registers, with the options it animates the change with
let recordedRenders: RecordedRender[] = []

/**
 * The ViewModel, with each commit recorded. Recorded from an effect rather than the render: the ViewModel
 * updates state during the render that changes the route, and React re-runs that render before committing.
 */
const useRecordedViewModel = () => {
  const viewModel = useRootStackViewModel()
  const { phase, verifyStackKey, transition, inSession } = viewModel

  useEffect(() => {
    recordedRenders.push({
      phase,
      inSession,
      transition,
      routeKey: getRootRouteKey({ phase, verifyStackKey: phase === RootPhase.Verify ? verifyStackKey : undefined }),
    })
  })

  return viewModel
}

const renderViewModel = () => renderHook(useRecordedViewModel)

/** The first render, then every render that registered a different route than the render before it */
const routeChanges = () =>
  recordedRenders.filter(({ routeKey }, index) => index === 0 || routeKey !== recordedRenders[index - 1].routeKey)
/** The routes the root registered, in order. A route listed twice was dropped and registered afresh in between */
const registeredRoutes = () => routeChanges().map(({ routeKey }) => routeKey)
/** The transition of each route change after the first render */
const swapTransitions = () =>
  routeChanges()
    .slice(1)
    .map(({ transition }) => transition)
/** The transition once the registered route has entered */
const settledTransition = () => recordedRenders[recordedRenders.length - 1].transition

const VERIFY_ROUTE = getRootRouteKey({ phase: RootPhase.Verify, verifyStackKey: 'verify' })
const OUTAGE_FALLBACK_ROUTE = getRootRouteKey({ phase: RootPhase.Verify, verifyStackKey: 'verify-outage-fallback' })

const NO_ANIMATION: RootTransition = { animationEnabled: false }
const PUSH: RootTransition = { animationEnabled: true, animationTypeForReplace: 'push' }
const POP: RootTransition = { animationEnabled: true, animationTypeForReplace: 'pop' }

describe('useRootStackViewModel', () => {
  const useStoreWith = (store: Record<string, any>, dispatch: jest.Mock = jest.fn()) =>
    jest.mocked(Bifold.useStore).mockReturnValue([store, dispatch] as any)

  beforeEach(() => {
    jest.clearAllMocks()
    recordedRenders = []
    mockIsClientReady.mockReturnValue(true)
    mockIsLoading.mockReturnValue(false)
    mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })
    jest.mocked(Bifold.useServices).mockReturnValue([jest.fn()])
    jest.mocked(useInitializeAccountStatusModule.useInitializeAccountStatus).mockReturnValue({
      initializingAccount: false,
    })
    jest.mocked(useFcmService).mockReturnValue({
      service: {},
      viewModel: { processPendingChallenges: mockProcessPendingChallenges },
    } as any)
  })

  describe('the phase', () => {
    it('is loading until the state has loaded', () => {
      useStoreWith(mockStore({ stateLoaded: false }))

      const { result } = renderViewModel()

      expect(result.current.phase).toBe(RootPhase.Loading)
    })

    it('is loading while the account is initializing', () => {
      useStoreWith(mockStore())
      jest.mocked(useInitializeAccountStatusModule.useInitializeAccountStatus).mockReturnValue({
        initializingAccount: true,
      })

      const { result } = renderViewModel()

      expect(result.current.phase).toBe(RootPhase.Loading)
    })

    it('is loading until the API client is ready', () => {
      useStoreWith(mockStore())
      mockIsClientReady.mockReturnValue(false)

      const { result } = renderViewModel()

      expect(result.current.phase).toBe(RootPhase.Loading)
    })

    it.each<[string, Record<string, any>, RootPhase]>([
      ['onboarding when there is no account', { bcsc: { hasAccount: false } }, RootPhase.Onboarding],
      [
        'auth when there is an account and the app is locked',
        { bcsc: { hasAccount: true }, authentication: { didAuthenticate: false } },
        RootPhase.Auth,
      ],
      [
        'verify when unlocked and verification is in progress',
        {
          bcsc: { hasAccount: true },
          authentication: { didAuthenticate: true },
          bcscSecure: { verified: false, inVerifyFlow: true },
        },
        RootPhase.Verify,
      ],
      [
        'main when unlocked and verified',
        { bcsc: { hasAccount: true }, authentication: { didAuthenticate: true }, bcscSecure: { verified: true } },
        RootPhase.Main,
      ],
      [
        'recovery when session recovery is required, overriding the verified → Home routing',
        {
          bcsc: { hasAccount: true },
          authentication: { didAuthenticate: true },
          // verified:true would normally route to MainStack — recovery must take precedence.
          // (VerifyStack starts on the SessionRecovery screen when sessionRecoveryRequired is set.)
          bcscSecure: { verified: true, sessionRecoveryRequired: true },
        },
        RootPhase.Recovery,
      ],
      [
        'main when an existing unverified account unlocks',
        {
          // The user is returning: the load-time migration stamped verificationSkipped:true and
          // verificationStarted:false on their already-onboarded state, so the prompt has passed them by.
          // They start verification from the MainStack instead.
          bcsc: { hasAccount: true, verificationSkipped: true, verificationStarted: false },
          authentication: { didAuthenticate: true },
          bcscSecure: { verified: false },
        },
        RootPhase.Main,
      ],
    ])('is %s', (_name, overrides, expectedPhase) => {
      useStoreWith(mockStore(overrides))

      const { result } = renderViewModel()

      expect(result.current.phase).toBe(expectedPhase)
    })
  })

  describe('the invalid environment recovery gate', () => {
    let isProductionBundleSpy: jest.SpyInstance

    afterEach(() => {
      isProductionBundleSpy.mockRestore()
    })

    const renderOn = (storeOverrides: Record<string, any>, isProduction: boolean) => {
      isProductionBundleSpy = jest.spyOn(environment, 'isProductionBundle').mockReturnValue(isProduction)
      jest.mocked(Bifold.useStore).mockReturnValue([mockStore(storeOverrides), jest.fn()] as any)

      return renderViewModel()
    }

    it('is up on a production bundle with a non-production environment, even with no account', () => {
      const { result } = renderOn({ developer: { environment: IASEnvironment.SIT } }, true)

      expect(result.current.showInvalidEnvironment).toBe(true)
    })

    it('is up even when the API client is not ready', () => {
      mockIsClientReady.mockReturnValue(false)

      const { result } = renderOn({ developer: { environment: IASEnvironment.SIT } }, true)

      expect(result.current.showInvalidEnvironment).toBe(true)
    })

    it('is down on a production bundle with the production environment', () => {
      const { result } = renderOn({ developer: { environment: IASEnvironment.PROD } }, true)

      expect(result.current.showInvalidEnvironment).toBe(false)
      expect(result.current.phase).toBe(RootPhase.Onboarding)
    })

    it('is down on a non-production bundle', () => {
      const { result } = renderOn({ developer: { environment: IASEnvironment.SIT } }, false)

      expect(result.current.showInvalidEnvironment).toBe(false)
      expect(result.current.phase).toBe(RootPhase.Onboarding)
    })

    it('is down before the state has loaded', () => {
      const { result } = renderOn({ stateLoaded: false, developer: { environment: IASEnvironment.SIT } }, true)

      expect(result.current.showInvalidEnvironment).toBe(false)
      expect(result.current.phase).toBe(RootPhase.Loading)
    })
  })

  it('moves to the verify prompt when onboarding completes, sliding it in over the screen that created the PIN', () => {
    const dispatch = jest.fn()
    useStoreWith(
      mockStore({
        bcsc: { hasAccount: false },
        authentication: { didAuthenticate: false },
        bcscSecure: { verified: false },
      }),
      dispatch
    )

    const { result, rerender } = renderViewModel()
    expect(result.current.phase).toBe(RootPhase.Onboarding)

    // Creating the PIN completes onboarding: SUCCESSFUL_AUTH sets both flags at once.
    useStoreWith(
      mockStore({
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false },
      }),
      dispatch
    )
    rerender({})

    expect(result.current.phase).toBe(RootPhase.Verify)
    expect(result.current.showVerifyPrompt).toBe(true)
    expect(swapTransitions()).toEqual([PUSH])
  })

  describe('verification resume routing', () => {
    type VerificationFlags = { verificationSkipped?: boolean; verificationStarted?: boolean }
    // The prompt hasn't been answered yet (just onboarded)
    const UNANSWERED: VerificationFlags = {}
    const SKIPPED: VerificationFlags = { verificationSkipped: true, verificationStarted: false }
    const CHOSE_TO_VERIFY: VerificationFlags = { verificationSkipped: false, verificationStarted: true }
    // Skipped the prompt, then started from Home (the card, a gated tab's prompt, a renewal)
    const SKIPPED_THEN_STARTED: VerificationFlags = { verificationSkipped: true, verificationStarted: true }

    const authedUnverified = (
      flags: VerificationFlags,
      facts: { inVerifyFlow?: boolean; credentialDeactivated?: boolean } = {}
    ) =>
      mockStore({
        bcsc: { hasAccount: true, ...flags },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false, ...facts },
      })

    const resumeDispatch = { type: 'bcsc/updateSecureInVerifyFlow', payload: [true] }
    const anyResumeDispatch = expect.objectContaining({ type: 'bcsc/updateSecureInVerifyFlow' })

    it('shows the verify prompt when it has not been answered', () => {
      const dispatch = jest.fn()
      useStoreWith(authedUnverified(UNANSWERED), dispatch)

      const { result } = renderViewModel()

      expect(result.current.phase).toBe(RootPhase.Verify)
      expect(result.current.showVerifyPrompt).toBe(true)
      // "not answered yet" — the prompt records the choice; no resume dispatch here.
      expect(dispatch).not.toHaveBeenCalledWith(anyResumeDispatch)
    })

    it('routes a user who skipped and never started verification straight to Home', () => {
      const dispatch = jest.fn()
      useStoreWith(authedUnverified(SKIPPED), dispatch)

      const { result } = renderViewModel()

      expect(result.current.phase).toBe(RootPhase.Main)
      expect(dispatch).not.toHaveBeenCalledWith(anyResumeDispatch)
    })

    it('re-enters verification on a cold start when it was started and is unfinished', () => {
      const dispatch = jest.fn()
      useStoreWith(authedUnverified(CHOSE_TO_VERIFY), dispatch)

      const { result, rerender } = renderViewModel()

      // The one-shot effect puts the user back in the verify flow so the verify stack takes over.
      expect(dispatch).toHaveBeenCalledWith(resumeDispatch)

      // Simulate that dispatch landing in the store.
      useStoreWith(authedUnverified(CHOSE_TO_VERIFY, { inVerifyFlow: true }), dispatch)
      rerender({})

      expect(result.current.phase).toBe(RootPhase.Verify)
    })

    it('re-enters verification for a user who skipped the prompt but started verification later', () => {
      const dispatch = jest.fn()
      useStoreWith(authedUnverified(SKIPPED_THEN_STARTED), dispatch)

      renderViewModel()

      // Started is what counts, not the answer to the prompt: a skip followed by a start from Home still resumes
      expect(dispatch).toHaveBeenCalledWith(resumeDispatch)
    })

    it('leaves a deactivated card on Home even when verification was started', () => {
      const dispatch = jest.fn()
      useStoreWith(authedUnverified(CHOSE_TO_VERIFY, { credentialDeactivated: true }), dispatch)

      const { result } = renderViewModel()

      // An expired or cancelled card is renewed from Home, not resumed
      expect(result.current.phase).toBe(RootPhase.Main)
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('only re-enters verification once per session (a later re-render does not re-dispatch)', () => {
      const dispatch = jest.fn()
      useStoreWith(authedUnverified(CHOSE_TO_VERIFY), dispatch)

      const { rerender } = renderViewModel()
      expect(dispatch).toHaveBeenCalledTimes(1)

      // useLeaveVerification has taken the user out of the verify flow to show Home for the rest of
      // the session; re-rendering in that state must not pull the user back into the verify stack.
      rerender({})
      expect(dispatch).toHaveBeenCalledTimes(1)
    })

    it('stays in the loading phase until the IAS status is known for a would-resume user', () => {
      const dispatch = jest.fn()
      mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: false })
      useStoreWith(authedUnverified(CHOSE_TO_VERIFY), dispatch)

      const { result } = renderViewModel()

      expect(result.current.phase).toBe(RootPhase.Loading)
      expect(dispatch).not.toHaveBeenCalledWith(anyResumeDispatch)
    })

    it('falls back to the verify prompt (not the resume step) and does not resume during an outage', () => {
      const dispatch = jest.fn()
      mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
      useStoreWith(authedUnverified(CHOSE_TO_VERIFY), dispatch)

      const { result } = renderViewModel()

      expect(result.current.phase).toBe(RootPhase.Verify)
      expect(result.current.showVerifyPrompt).toBe(true)
      // Registered under its own key, so the verify stack is dropped and registered afresh once IAS is back
      expect(result.current.verifyStackKey).toBe('verify-outage-fallback')
      expect(dispatch).not.toHaveBeenCalledWith(anyResumeDispatch)
    })

    describe('after the startup resume', () => {
      /**
       * Cold-start harness whose dispatch lands in the mocked store. The render the resume effect
       * triggers then sees the verify flow together with the evaluated flag, as React batches the two in
       * the app. `apply` plays a store change made elsewhere, e.g. useLeaveVerification leaving the flow;
       * `answerPrompt` answers the prompt the way VerifyPromptScreen does.
       */
      const renderColdStart = (initial: Record<string, any>) => {
        let state = initial
        const dispatch = jest.fn((action: { type: string; payload?: any[] }) => {
          if (action.type === 'bcsc/updateSecureInVerifyFlow') {
            state = { ...state, bcscSecure: { ...state.bcscSecure, inVerifyFlow: action.payload?.[0] } }
          }
        })
        jest.mocked(Bifold.useStore).mockImplementation(() => [state, dispatch] as any)
        const utils = renderViewModel()
        const apply = (patch: (current: Record<string, any>) => Record<string, any>) => {
          state = patch(state)
          utils.rerender({})
        }
        const answerPrompt = () => act(() => utils.result.current.onVerifyPromptAnswered())
        return { ...utils, dispatch, apply, answerPrompt }
      }

      const withInVerifyFlow = (inVerifyFlow: boolean) => (current: Record<string, any>) => ({
        ...current,
        bcscSecure: { ...current.bcscSecure, inVerifyFlow },
      })

      it('registers the verify stack once on a cold-start resume, never showing Home in between', () => {
        const { result, dispatch } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))

        expect(dispatch).toHaveBeenCalledWith(resumeDispatch)
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(registeredRoutes()).toEqual([VERIFY_ROUTE])
      })

      it('returns a resumed user to Home when they leave verification', () => {
        const { result, dispatch, apply } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(result.current.phase).toBe(RootPhase.Verify)

        // Back arrow / "Back to home": useLeaveVerification leaves the flow.
        apply(withInVerifyFlow(false))

        expect(result.current.phase).toBe(RootPhase.Main)
        // Leaving must not read as a resume still pending, or the user is pulled straight back.
        expect(dispatch).toHaveBeenCalledTimes(1)
      })

      it('returns a first-time verifier who walked back to the prompt and skips to Home', () => {
        const { result, dispatch, apply, answerPrompt, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(result.current.phase).toBe(RootPhase.Verify)

        // Back from the first step replaced onto the prompt (still in the verify flow). Its Skip answers the
        // prompt, records the skip and leaves the flow (useLeaveVerification) in one press.
        answerPrompt()
        apply((current) => ({
          ...withInVerifyFlow(false)(current),
          bcsc: { ...current.bcsc, verificationSkipped: true },
        }))

        expect(result.current.phase).toBe(RootPhase.Main)
        // Started stays set, but the resume was already evaluated: nothing pulls them back in this session.
        rerender({})
        expect(result.current.phase).toBe(RootPhase.Main)
        expect(dispatch).toHaveBeenCalledTimes(1)
      })

      it('registers the verify stack afresh when a restart resets the flow and re-enters verification', () => {
        const { result, apply } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(registeredRoutes()).toEqual([VERIFY_ROUTE])

        // useVerificationReset clears the flow, then continueVerificationProcess re-enters it.
        apply(withInVerifyFlow(false))
        expect(result.current.phase).toBe(RootPhase.Main)
        apply(withInVerifyFlow(true))

        expect(result.current.phase).toBe(RootPhase.Verify)
        // A fresh registration mounts the stack again, which re-runs the resume-step routing: the first step
        expect(registeredRoutes()).toEqual([VERIFY_ROUTE, 'main', VERIFY_ROUTE])
      })

      it('lets a user who skipped earlier start from the Home card and leave again', () => {
        const { result, dispatch, apply } = renderColdStart(authedUnverified(SKIPPED))
        expect(result.current.phase).toBe(RootPhase.Main)
        expect(dispatch).not.toHaveBeenCalled()

        // "Start verification" on the Home card: verificationStarted=true and the verify flow together.
        apply((current) => ({
          ...withInVerifyFlow(true)(current),
          bcsc: { ...current.bcsc, verificationStarted: true },
        }))
        expect(result.current.phase).toBe(RootPhase.Verify)

        apply(withInVerifyFlow(false))

        // In session, leaving lands on Home; only the next cold start or unlock resumes them.
        expect(result.current.phase).toBe(RootPhase.Main)
        expect(dispatch).not.toHaveBeenCalled()
      })

      it('lets a started user who skips on the outage fallback reach Home and stay there once IAS recovers', () => {
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        const { result, dispatch, apply, answerPrompt, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(result.current.showVerifyPrompt).toBe(true)

        // The outage screen's Skip: VerifyPromptScreen answers the prompt, then records the skip. Started
        // stays set, so the answer alone has to settle the pending resume.
        answerPrompt()
        apply((current) => ({ ...current, bcsc: { ...current.bcsc, verificationSkipped: true } }))

        expect(result.current.phase).toBe(RootPhase.Main)

        mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })
        rerender({})

        expect(result.current.phase).toBe(RootPhase.Main)
        expect(dispatch).not.toHaveBeenCalled()
      })

      it('resumes once an outage that blocked the cold-start resume clears', () => {
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        const { result, dispatch, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(dispatch).not.toHaveBeenCalled()

        mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })
        rerender({})

        expect(dispatch).toHaveBeenCalledTimes(1)
        expect(dispatch).toHaveBeenCalledWith(resumeDispatch)
        expect(result.current.phase).toBe(RootPhase.Verify)
      })

      it('keeps a user who left on Home when an outage begins later in the session', () => {
        const { result, apply, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        apply(withInVerifyFlow(false))
        expect(result.current.phase).toBe(RootPhase.Main)

        // The outage fallback prompt is a cold-start affordance; mid-session the banner covers it.
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        rerender({})

        expect(result.current.phase).toBe(RootPhase.Main)
      })

      it('offers the prompt again when the account is removed and onboarding is redone in the same session', () => {
        // Fresh install: onboarding, then the prompt once the PIN is created (SUCCESSFUL_AUTH)
        const { result, dispatch, apply, answerPrompt } = renderColdStart(mockStore())
        expect(result.current.phase).toBe(RootPhase.Onboarding)
        apply((current) => ({ ...current, bcsc: { hasAccount: true }, authentication: { didAuthenticate: true } }))
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(result.current.showVerifyPrompt).toBe(true)

        // Skip, then start verification from the Home card
        answerPrompt()
        apply((current) => ({ ...current, bcsc: { ...current.bcsc, verificationSkipped: true } }))
        expect(result.current.phase).toBe(RootPhase.Main)
        apply((current) => ({
          ...withInVerifyFlow(true)(current),
          bcsc: { ...current.bcsc, verificationStarted: true },
        }))
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(result.current.showVerifyPrompt).toBe(false)

        // Remove account (useFactoryReset): CLEAR_BCSC, CLEAR_SECURE_STATE and DID_AUTHENTICATE false, with
        // the root still mounted
        apply(() => mockStore())
        expect(result.current.phase).toBe(RootPhase.Onboarding)

        // Onboarding again: the prompt is due like on a fresh install, and no resume is pending
        apply((current) => ({ ...current, bcsc: { hasAccount: true }, authentication: { didAuthenticate: true } }))
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(result.current.showVerifyPrompt).toBe(true)
        expect(dispatch).not.toHaveBeenCalled()
      })

      /**
       * The inactivity timeout's logout(): CLEAR_SECURE_STATE puts the secure state back to its initial
       * values (the memory-only verify flow with it), then DID_AUTHENTICATE false. The unlock hydrates the
       * facts from the credential (neither set for an unverified user) before SUCCESSFUL_AUTH.
       */
      const lock = (current: Record<string, any>) => ({
        ...current,
        bcscSecure: { verified: false },
        authentication: { didAuthenticate: false },
      })
      const unlock = (current: Record<string, any>) => ({
        ...current,
        bcscSecure: { ...current.bcscSecure, isHydrated: true },
        authentication: { didAuthenticate: true },
      })
      /**
       * Continue on the prompt (VerifyPromptScreen.handleVerifyNow): the answer, verificationSkipped=false,
       * started and the verify flow are one event handler, so they land in one render.
       */
      const continueOnPrompt = ({ result, apply }: ReturnType<typeof renderColdStart>) =>
        act(() => {
          result.current.onVerifyPromptAnswered()
          apply((current) => ({
            ...withInVerifyFlow(true)(current),
            bcsc: { ...current.bcsc, verificationSkipped: false, verificationStarted: true },
          }))
        })

      it('resumes a started verification after an unlock, never showing Home in between', () => {
        const coldStart = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
        const { result, dispatch, apply } = coldStart
        expect(result.current.phase).toBe(RootPhase.Verify)

        apply(lock)
        expect(result.current.phase).toBe(RootPhase.Auth)
        apply(unlock)

        // The lock took the verify flow with the secure state, so the unlock resumes like a relaunch does
        expect(dispatch).toHaveBeenCalledTimes(2)
        expect(dispatch).toHaveBeenLastCalledWith(resumeDispatch)
        expect(result.current.phase).toBe(RootPhase.Verify)
        // A fresh registration re-runs the resume-step routing against the hydrated state
        expect(registeredRoutes()).toEqual([VERIFY_ROUTE, 'auth', VERIFY_ROUTE])
      })

      it('resumes a first-time verifier who locked mid-flow at their step, not at the prompt or Home', () => {
        const coldStart = renderColdStart(authedUnverified(UNANSWERED))
        const { result, dispatch, apply } = coldStart
        expect(result.current.showVerifyPrompt).toBe(true)

        continueOnPrompt(coldStart)
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(dispatch).not.toHaveBeenCalled()

        apply(lock)
        apply(unlock)

        expect(dispatch).toHaveBeenCalledTimes(1)
        expect(dispatch).toHaveBeenCalledWith(resumeDispatch)
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(result.current.showVerifyPrompt).toBe(false)
        expect(registeredRoutes()).not.toContain('main')
      })

      it('falls back to the verify prompt when the unlock happens during an outage, even once answered', () => {
        const coldStart = renderColdStart(authedUnverified(UNANSWERED))
        const { result, dispatch, apply, answerPrompt, rerender } = coldStart
        continueOnPrompt(coldStart)
        expect(result.current.showVerifyPrompt).toBe(false)

        apply(lock)
        mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
        apply(unlock)

        // The resume is held off, and the prompt's Skip is the way to Home again, as on a cold start
        expect(result.current.phase).toBe(RootPhase.Verify)
        expect(result.current.showVerifyPrompt).toBe(true)
        expect(dispatch).not.toHaveBeenCalled()

        answerPrompt()
        apply((current) => ({ ...current, bcsc: { ...current.bcsc, verificationSkipped: true } }))
        expect(result.current.phase).toBe(RootPhase.Main)

        mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })
        rerender({})
        expect(result.current.phase).toBe(RootPhase.Main)
        expect(dispatch).not.toHaveBeenCalled()
      })

      it('resumes a deferred verifier who left for Home on the next unlock, who can leave again', () => {
        const { result, dispatch, apply } = renderColdStart(authedUnverified(SKIPPED_THEN_STARTED))
        apply(withInVerifyFlow(false))
        expect(result.current.phase).toBe(RootPhase.Main)

        apply(lock)
        apply(unlock)

        // Started is what an unlock resumes, as a relaunch does; every exit is still theirs
        expect(dispatch).toHaveBeenCalledTimes(2)
        expect(result.current.phase).toBe(RootPhase.Verify)

        apply(withInVerifyFlow(false))
        expect(result.current.phase).toBe(RootPhase.Main)
        expect(dispatch).toHaveBeenCalledTimes(2)
      })

      describe('animating the change of phase', () => {
        it('cuts in the first route and settles its options on animated once it has entered', () => {
          renderColdStart(authedUnverified(SKIPPED))

          expect(recordedRenders[0]).toMatchObject({ routeKey: 'main', transition: NO_ANIMATION })
          // A later change pops the route with these options, so they must not stay at animationEnabled: false
          expect(settledTransition()).toEqual(IDLE_ROOT_TRANSITION)
        })

        it('cuts from the startup loading route to the first stack', () => {
          mockIsClientReady.mockReturnValue(false)
          const { result, rerender } = renderColdStart(authedUnverified(SKIPPED))
          expect(result.current.phase).toBe(RootPhase.Loading)

          mockIsClientReady.mockReturnValue(true)
          rerender({})

          expect(result.current.phase).toBe(RootPhase.Main)
          expect(swapTransitions()).toEqual([NO_ANIMATION])
          expect(settledTransition()).toEqual(IDLE_ROOT_TRANSITION)
        })

        it('pushes Home in over the prompt when a first-time user skips it', () => {
          const { result, apply, answerPrompt } = renderColdStart(authedUnverified(UNANSWERED))
          expect(result.current.phase).toBe(RootPhase.Verify)

          answerPrompt()
          apply((current) => ({ ...current, bcsc: { ...current.bcsc, verificationSkipped: true } }))

          expect(result.current.phase).toBe(RootPhase.Main)
          expect(swapTransitions()).toEqual([PUSH])
        })

        it('pushes the verify flow in over Home and pops it back out when the user leaves', () => {
          const { result, apply } = renderColdStart(authedUnverified(SKIPPED))

          // "Start verification" on the Home card, then the back arrow / "Back to home"
          apply((current) => ({
            ...withInVerifyFlow(true)(current),
            bcsc: { ...current.bcsc, verificationStarted: true },
          }))
          expect(result.current.phase).toBe(RootPhase.Verify)
          apply(withInVerifyFlow(false))
          expect(result.current.phase).toBe(RootPhase.Main)

          expect(swapTransitions()).toEqual([PUSH, POP])
        })

        it('pops back to Home when a first-time verifier walks back to the prompt and skips', () => {
          const { result, apply, answerPrompt } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
          expect(result.current.phase).toBe(RootPhase.Verify)

          answerPrompt()
          apply((current) => ({
            ...withInVerifyFlow(false)(current),
            bcsc: { ...current.bcsc, verificationSkipped: true },
          }))

          expect(result.current.phase).toBe(RootPhase.Main)
          expect(swapTransitions()).toEqual([POP])
        })

        it('pushes Home in when verification finishes', () => {
          const { result, apply } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
          expect(result.current.phase).toBe(RootPhase.Verify)

          // Continue on the success screen sets `verified`
          apply((current) => ({ ...current, bcscSecure: { ...current.bcscSecure, verified: true } }))

          expect(result.current.phase).toBe(RootPhase.Main)
          expect(swapTransitions()).toEqual([PUSH])
        })

        it('cuts to the lock screen and pushes the unlocked stack back in', () => {
          const { result, apply } = renderColdStart(authedUnverified(SKIPPED))

          apply(lock)
          expect(result.current.phase).toBe(RootPhase.Auth)
          apply(unlock)
          expect(result.current.phase).toBe(RootPhase.Main)

          expect(swapTransitions()).toEqual([NO_ANIMATION, PUSH])
        })

        it("cuts into a verified user's Home on the unlock, as Home waits for the account", () => {
          const { result, apply } = renderColdStart(
            mockStore({
              bcsc: { hasAccount: true, verificationSkipped: true },
              authentication: { didAuthenticate: true },
              bcscSecure: { verified: true },
            })
          )
          expect(result.current.phase).toBe(RootPhase.Main)

          apply(lock)
          expect(result.current.phase).toBe(RootPhase.Auth)
          // The unlock hydrates the verified flag before SUCCESSFUL_AUTH
          apply((current) => ({
            ...unlock(current),
            bcscSecure: { verified: true, isHydrated: true },
          }))
          expect(result.current.phase).toBe(RootPhase.Main)

          expect(swapTransitions()).toEqual([NO_ANIMATION, NO_ANIMATION])
          // A later change can still pop the route with an animation
          expect(settledTransition()).toEqual(IDLE_ROOT_TRANSITION)
        })

        it('cuts to onboarding when the account is removed', () => {
          const { result, apply } = renderColdStart(authedUnverified(SKIPPED))

          apply(() => mockStore())

          expect(result.current.phase).toBe(RootPhase.Onboarding)
          expect(swapTransitions()).toEqual([NO_ANIMATION])
        })

        it('does not animate a change hidden by the global loading overlay', () => {
          const { result, apply, answerPrompt, rerender } = renderColdStart(authedUnverified(UNANSWERED))

          mockIsLoading.mockReturnValue(true)
          answerPrompt()
          apply((current) => ({ ...current, bcsc: { ...current.bcsc, verificationSkipped: true } }))

          expect(result.current.phase).toBe(RootPhase.Main)
          expect(swapTransitions()).toEqual([NO_ANIMATION])

          // The route still settles on animated options for the next change
          mockIsLoading.mockReturnValue(false)
          rerender({})
          expect(settledTransition()).toEqual(IDLE_ROOT_TRANSITION)
        })

        it('does not animate the verify stack re-registering when the outage blocking a resume clears', () => {
          mockUseServerStatus.mockReturnValue({ isAvailable: false, hasChecked: true })
          const { result, rerender } = renderColdStart(authedUnverified(CHOSE_TO_VERIFY))
          expect(result.current.phase).toBe(RootPhase.Verify)

          mockUseServerStatus.mockReturnValue({ isAvailable: true, hasChecked: true })
          rerender({})

          expect(result.current.phase).toBe(RootPhase.Verify)
          expect(registeredRoutes()).toEqual([OUTAGE_FALLBACK_ROUTE, VERIFY_ROUTE])
          expect(swapTransitions()).toEqual([NO_ANIMATION])
        })
      })

      describe('the session', () => {
        it('runs on across verify ↔ main changes', () => {
          const { result, apply } = renderColdStart(authedUnverified(SKIPPED))
          expect(result.current.phase).toBe(RootPhase.Main)

          // "Start verification" on the Home card, then the back arrow / "Back to home"
          apply((current) => ({
            ...withInVerifyFlow(true)(current),
            bcsc: { ...current.bcsc, verificationStarted: true },
          }))
          expect(result.current.phase).toBe(RootPhase.Verify)
          apply(withInVerifyFlow(false))
          expect(result.current.phase).toBe(RootPhase.Main)

          expect(recordedRenders.every(({ inSession }) => inSession)).toBe(true)
        })

        it('ends on a lock and the next starts on the unlock', () => {
          const { result, apply } = renderColdStart(authedUnverified(SKIPPED))
          expect(result.current.inSession).toBe(true)

          apply(lock)
          expect(result.current.inSession).toBe(false)

          apply(unlock)
          expect(result.current.inSession).toBe(true)
        })

        it('ends when the account is removed', () => {
          const { result, apply } = renderColdStart(authedUnverified(SKIPPED))

          apply(() => mockStore())

          expect(result.current.phase).toBe(RootPhase.Onboarding)
          expect(result.current.inSession).toBe(false)
        })

        it('has not started while the app is still starting up', () => {
          mockIsClientReady.mockReturnValue(false)

          const { result } = renderColdStart(authedUnverified(SKIPPED))

          expect(result.current.inSession).toBe(false)
        })
      })
    })
  })

  describe('startup', () => {
    it('loads the persisted state when it has not been loaded', () => {
      const dispatch = jest.fn()
      const loadState = jest.fn()
      useStoreWith(mockStore({ stateLoaded: false }), dispatch)
      jest.mocked(Bifold.useServices).mockReturnValue([loadState])

      renderViewModel()

      expect(loadState).toHaveBeenCalledWith(dispatch)
    })

    it('does not load the state again once it has loaded', () => {
      const loadState = jest.fn()
      useStoreWith(mockStore({ stateLoaded: true }))
      jest.mocked(Bifold.useServices).mockReturnValue([loadState])

      renderViewModel()

      expect(loadState).not.toHaveBeenCalled()
    })

    it('shows the problem modal when loading the state throws', () => {
      const error = new Error('load failed')
      const loadState = jest.fn().mockImplementation(() => {
        throw error
      })
      useStoreWith(mockStore({ stateLoaded: false }))
      jest.mocked(Bifold.useServices).mockReturnValue([loadState])

      renderViewModel()

      expect(mockEmitErrorModal).toHaveBeenCalledWith(
        'Error.Problem',
        'Error.ProblemDescription',
        toAppError(error, ErrorRegistry.STATE_LOAD_ERROR)
      )
    })

    it('processes pending FCM challenges once the API client is ready', () => {
      useStoreWith(mockStore())

      renderViewModel()

      expect(mockProcessPendingChallenges).toHaveBeenCalledTimes(1)
    })

    it('does not process pending FCM challenges before the API client is ready', () => {
      useStoreWith(mockStore())
      mockIsClientReady.mockReturnValue(false)

      renderViewModel()

      expect(mockProcessPendingChallenges).not.toHaveBeenCalled()
    })
  })
})

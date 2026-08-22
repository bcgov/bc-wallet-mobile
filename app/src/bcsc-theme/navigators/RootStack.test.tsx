import { ErrorRegistry } from '@/errors'
import { VerificationStatus } from '@/store'
import * as Bifold from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import * as useInitializeAccountStatusModule from '../api/hooks/useInitializeAccountStatus'
import { useFcmService } from '../features/fcm'
import { toAppError } from '../utils/native-error-map'
import BCSCRootStack from './RootStack'

// Readiness is swapped per test through these mocks rather than by reassigning the mocked module
// exports, which nothing would undo if a test failed part way through.
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
  LoadingScreen: () => 'LoadingScreen',
}))
jest.mock('./AuthStack', () => ({
  __esModule: true,
  default: () => 'AuthStack',
}))
jest.mock('./MainStack', () => ({
  __esModule: true,
  default: () => 'MainStack',
}))
jest.mock('./OnboardingStack', () => ({
  __esModule: true,
  default: () => 'OnboardingStack',
}))
jest.mock('./VerifyStack', () => ({
  __esModule: true,
  default: () => 'VerifyStack',
}))
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

const mockStore = (overrides: Record<string, any> = {}) => ({
  stateLoaded: true,
  bcsc: { hasAccount: false },
  bcscSecure: { verified: false },
  authentication: { didAuthenticate: false },
  ...overrides,
})

const mockProcessPendingChallenges = jest.fn()

describe('BCSCRootStack', () => {
  let mockDispatch: jest.Mock
  let mockLoadState: jest.Mock

  const setStore = (overrides: Record<string, any> = {}) =>
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(overrides), mockDispatch] as any)

  const renderRoot = (overrides: Record<string, any> = {}) => {
    setStore(overrides)
    return render(<BCSCRootStack />)
  }

  beforeEach(() => {
    mockDispatch = jest.fn()
    mockLoadState = jest.fn()

    mockIsClientReady.mockReturnValue(true)
    mockIsNavigationReady.mockReturnValue(true)

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
    const { toJSON } = renderRoot({ stateLoaded: false })

    expect(toJSON()).toBe('LoadingScreen')
  })

  it('renders LoadingScreen when initializingAccount is true', () => {
    jest.mocked(useInitializeAccountStatusModule.useInitializeAccountStatus).mockReturnValue({
      initializingAccount: true,
    })

    const { toJSON } = renderRoot()

    expect(toJSON()).toBe('LoadingScreen')
  })

  it('renders LoadingScreen when isClientReady is false', () => {
    mockIsClientReady.mockReturnValue(false)

    const { toJSON } = renderRoot()

    expect(toJSON()).toBe('LoadingScreen')
  })

  it('renders LoadingScreen when isNavigationReady is false', () => {
    mockIsNavigationReady.mockReturnValue(false)

    const { toJSON } = renderRoot()

    expect(toJSON()).toBe('LoadingScreen')
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
      // verified:true would normally route to MainStack — recovery must take precedence.
      // (VerifyStack starts on the SessionRecovery screen when sessionRecoveryRequired is set.)
      'VerifyStack when sessionRecoveryRequired is set, overriding the verified→Home routing',
      {
        bcsc: { hasAccount: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: true, sessionRecoveryRequired: true },
      },
      'VerifyStack',
    ],
    [
      'MainStack as fallback when verified is undefined',
      { bcsc: { hasAccount: true }, authentication: { didAuthenticate: true }, bcscSecure: { verified: undefined } },
      'MainStack',
    ],
    [
      // No OnboardingStack render this session — the user is returning, so the one-time prompt has
      // passed them by. They start verification from the MainStack instead.
      'MainStack when an existing unverified account unlocks',
      { bcsc: { hasAccount: true }, authentication: { didAuthenticate: true }, bcscSecure: { verified: false } },
      'MainStack',
    ],
  ])('renders %s', (_name, overrides, expectedStack) => {
    const { toJSON } = renderRoot(overrides)

    expect(toJSON()).toBe(expectedStack)
  })

  it('renders VerifyStack (which opens on the verify prompt) when onboarding completes', () => {
    const { toJSON, rerender } = renderRoot({
      bcsc: { hasAccount: false },
      authentication: { didAuthenticate: false },
      bcscSecure: { verified: false },
    })
    expect(toJSON()).toBe('OnboardingStack')

    // Creating the PIN completes onboarding: SUCCESSFUL_AUTH sets both flags at once.
    setStore({
      bcsc: { hasAccount: true },
      authentication: { didAuthenticate: true },
      bcscSecure: { verified: false },
    })
    rerender(<BCSCRootStack />)

    expect(toJSON()).toBe('VerifyStack')
  })

  it('calls loadState when stateLoaded is false', () => {
    renderRoot({ stateLoaded: false })

    expect(mockLoadState).toHaveBeenCalledWith(mockDispatch)
  })

  it('does not call loadState when stateLoaded is true', () => {
    renderRoot({ stateLoaded: true })

    expect(mockLoadState).not.toHaveBeenCalled()
  })

  it('calls emitErrorModal when loadState throws', () => {
    const mockError = new Error('load failed')
    mockLoadState.mockImplementation(() => {
      throw mockError
    })

    renderRoot({ stateLoaded: false })

    expect(mockEmitErrorModal).toHaveBeenCalledWith(
      'Error.Problem',
      'Error.ProblemDescription',
      toAppError(mockError, ErrorRegistry.STATE_LOAD_ERROR)
    )
  })

  it('processPendingChallenges is called when api client is ready', () => {
    renderRoot()

    expect(mockProcessPendingChallenges).toHaveBeenCalledTimes(1)
  })

  it('processPendingChallenges is not called when api client is not ready', () => {
    mockIsClientReady.mockReturnValue(false)

    renderRoot()

    expect(mockProcessPendingChallenges).not.toHaveBeenCalled()
  })
})

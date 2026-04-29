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
jest.mock('../features/onboarding/VerifyPromptScreen', () => ({
  __esModule: true,
  default: () => 'VerifyPromptScreen',
}))
jest.mock('../contexts/BCSCActivityContext', () => ({
  BCSCActivityProvider: ({ children }: any) => children,
}))
jest.mock('../contexts/BCSCAccountContext', () => ({
  BCSCAccountProvider: ({ children }: any) => children,
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
  bcsc: { hasAccount: false, nicknames: [] },
  bcscSecure: { verified: false },
  authentication: { didAuthenticate: false },
  ...overrides,
})

const mockProcessPendingChallenges = jest.fn()

describe('BCSCRootStack', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    const mockLoadState = jest.fn()
    jest.mocked(Bifold.useServices).mockReturnValue([mockLoadState] as any)
    jest.mocked(useInitializeAccountStatusModule.useInitializeAccountStatus).mockReturnValue({
      initializingAccount: false,
    })
    jest.mocked(useFcmService).mockReturnValue({
      service: {},
      viewModel: { processPendingChallenges: mockProcessPendingChallenges },
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
    jest
      .mocked(Bifold.useStore)
      .mockReturnValue([mockStore({ bcsc: { hasAccount: false, nicknames: [] } }), mockDispatch] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('OnboardingStack')
  })

  it('renders AuthStack when hasAccount is true and didAuthenticate is false', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true, nicknames: [] },
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
        bcsc: { hasAccount: true, nicknames: [] },
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
        bcsc: { hasAccount: true, nicknames: [] },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: true },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('MainStack')
  })

  it('renders MainStack as fallback when verified is undefined', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true, nicknames: [], hasSeenVerifyPrompt: true },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: undefined },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('MainStack')
  })

  it('renders VerifyPromptScreen when user has not seen verify prompt and is not verified', () => {
    const mockDispatch = jest.fn()
    jest.mocked(Bifold.useStore).mockReturnValue([
      mockStore({
        bcsc: { hasAccount: true, nicknames: [], hasSeenVerifyPrompt: false },
        authentication: { didAuthenticate: true },
        bcscSecure: { verified: false },
      }),
      mockDispatch,
    ] as any)

    const { toJSON } = render(<BCSCRootStack />)

    expect(toJSON()).toBe('VerifyPromptScreen')
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

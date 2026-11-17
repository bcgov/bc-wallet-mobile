import { EXPIRED_JWT } from '@/bcsc-theme/utils/__fixtures__/jwt'
import * as Bifold from '@bifold/core'
import { render } from '@testing-library/react-native'
import React from 'react'
import { useFcmService } from '../features/fcm'
import { BCSCScreens, BCSCStacks } from '../types/navigators'
import { IDLE_ROOT_TRANSITION } from './root-transition'
import BCSCRootStack from './RootStack'
import { RootStackViewModel } from './useRootStackViewModel'

let mockAccount: { account_expiration_date: Date } | null = null
const mockViewModel = jest.fn()
// Each render's registered screen and screen options: what the real navigator reads to animate a route change
const mockNavigatorRender = jest.fn()
// Records every render's props, so a test can check what the main stack is handed
const mockMainStackProps = jest.fn()

jest.mock('@bifold/core')
jest.mock('./useRootStackViewModel', () => ({
  useRootStackViewModel: () => mockViewModel(),
}))
// Renders the one registered screen. A navigationKey change remounts it, as the real navigator would.
jest.mock('@react-navigation/stack', () => {
  const React = jest.requireActual('react')
  const Screen = ({ name, navigationKey, component: Component, children }: any) => (
    <React.Fragment key={`${name}:${navigationKey ?? ''}`}>{Component ? <Component /> : children()}</React.Fragment>
  )
  const Navigator = ({ children, screenOptions }: any) => {
    const [screen] = React.Children.toArray(children)
    mockNavigatorRender({
      screen: { name: screen?.props.name, navigationKey: screen?.props.navigationKey },
      options: screenOptions,
    })
    return children
  }
  return { createStackNavigator: () => ({ Navigator, Screen }) }
})
jest.mock('../features/fcm', () => ({
  useFcmService: jest.fn(),
}))
jest.mock('../contexts/BCSCLoadingContext', () => ({
  LoadingScreen: 'LoadingScreen',
}))
jest.mock('../features/modal/InvalidEnvironment', () => ({
  InvalidEnvironment: () => 'InvalidEnvironment',
}))
jest.mock('./AuthStack', () => ({
  __esModule: true,
  default: () => 'AuthStack',
}))
jest.mock('./MainStack', () => ({
  __esModule: true,
  default: (props: any) => {
    mockMainStackProps(props)
    return 'MainStack'
  },
}))
jest.mock('./OnboardingStack', () => ({
  __esModule: true,
  default: () => 'OnboardingStack',
}))
// Counts mounts, not renders: a remount is what re-runs VerifyStack's resume-step routing
const mockVerifyStackMount = jest.fn()
// Records every render's props, so a test can check what the stack is handed
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
// The session providers above the route: each render's `enabled`, and their mounts (a remount would restart them)
const mockAgentProviderRender = jest.fn()
const mockAgentProviderMount = jest.fn()
jest.mock('../features/agent/BCSCAgentProvider', () => {
  const { useEffect } = jest.requireActual('react')
  const BCSCAgentProvider = ({ enabled, children }: any) => {
    mockAgentProviderRender(enabled)
    useEffect(() => {
      mockAgentProviderMount()
    }, [])
    return children
  }
  return { __esModule: true, default: BCSCAgentProvider }
})
const mockAccountProviderRender = jest.fn()
const mockAccountProviderMount = jest.fn()
jest.mock('../contexts/BCSCAccountContext', () => {
  const { useEffect } = jest.requireActual('react')
  const BCSCAccountProvider = ({ enabled, children }: any) => {
    mockAccountProviderRender(enabled)
    useEffect(() => {
      mockAccountProviderMount()
    }, [])
    return children
  }
  return { BCSCAccountProvider, useAccount: () => ({ account: mockAccount }) }
})
const mockSessionProviderRender = jest.fn()
const mockSessionProviderMount = jest.fn()
jest.mock('../contexts/SystemCheckSessionContext', () => {
  const { useEffect } = jest.requireActual('react')
  const SystemCheckSessionProvider = ({ enabled, children }: any) => {
    mockSessionProviderRender(enabled)
    useEffect(() => {
      mockSessionProviderMount()
    }, [])
    return children
  }
  return { SystemCheckSessionProvider }
})
const mockIdTokenProviderRender = jest.fn()
jest.mock('../contexts/BCSCIdTokenContext', () => ({
  BCSCIdTokenProvider: ({ children }: any) => {
    mockIdTokenProviderRender()
    return children
  },
}))

const viewModel = (overrides: Partial<RootStackViewModel> = {}): RootStackViewModel => ({
  showInvalidEnvironment: false,
  phase: 'main',
  transition: IDLE_ROOT_TRANSITION,
  inSession: true,
  isVerified: true,
  verifyStackKey: 'verify',
  showVerifyPrompt: false,
  onVerifyPromptAnswered: jest.fn(),
  ...overrides,
})

// What FcmCardExpirySync reads: the card status and the account phase derive from the store and the account
const mockStore = (secure: Record<string, any> = {}) => ({
  stateLoaded: true,
  bcsc: { hasAccount: true },
  bcscSecure: { verified: true, ...secure },
  authentication: { didAuthenticate: true },
})

const mockLogger = { info: jest.fn() }
const mockSetCardExpired = jest.fn()

type NavigatorRender = { screen: { name: string; navigationKey?: string }; options: Record<string, unknown> }
const lastNavigatorRender = (): NavigatorRender => mockNavigatorRender.mock.lastCall?.[0]

describe('BCSCRootStack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAccount = null
    mockViewModel.mockReturnValue(viewModel())
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore(), jest.fn()] as any)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(useFcmService).mockReturnValue({
      service: {},
      viewModel: { setCardExpired: mockSetCardExpired },
    } as any)
  })

  const renderWith = (overrides: Partial<RootStackViewModel>) => {
    mockViewModel.mockReturnValue(viewModel(overrides))
    return render(<BCSCRootStack />)
  }

  const rerenderWith = (rerender: (ui: React.ReactElement) => void, overrides: Partial<RootStackViewModel>) => {
    mockViewModel.mockReturnValue(viewModel(overrides))
    rerender(<BCSCRootStack />)
  }

  describe('the registered route', () => {
    it('is the startup loading screen in the loading phase', () => {
      const { toJSON } = renderWith({ phase: 'loading', inSession: false })

      expect(toJSON()).toMatchObject({ type: 'LoadingScreen', props: { message: 'BCSC.Loading.AppStartup' } })
      expect(lastNavigatorRender().screen).toEqual({ name: BCSCScreens.RootLoading, navigationKey: undefined })
    })

    it.each<[RootStackViewModel['phase'], string, string]>([
      ['onboarding', BCSCStacks.Onboarding, 'OnboardingStack'],
      ['auth', BCSCStacks.Auth, 'AuthStack'],
      ['recovery', BCSCStacks.Verify, 'VerifyStack'],
      ['verify', BCSCStacks.Verify, 'VerifyStack'],
      ['main', BCSCStacks.Main, 'MainStack'],
    ])('is the %s phase stack', (phase, name, rendered) => {
      const { toJSON } = renderWith({ phase })

      expect(toJSON()).toBe(rendered)
      expect(lastNavigatorRender().screen.name).toBe(name)
    })

    it('opens the verify stack on the prompt when the ViewModel says so, with the answer handed down', () => {
      const onVerifyPromptAnswered = jest.fn()

      renderWith({ phase: 'verify', showVerifyPrompt: true, onVerifyPromptAnswered })

      expect(mockVerifyStackProps).toHaveBeenLastCalledWith({ showVerifyPrompt: true, onVerifyPromptAnswered })
    })

    it('opens the verify stack without the prompt in the recovery phase', () => {
      renderWith({ phase: 'recovery', showVerifyPrompt: true })

      expect(mockVerifyStackProps).toHaveBeenLastCalledWith({})
    })

    it('registers the verify stack under its navigation key, and afresh when the key changes', () => {
      const { rerender } = renderWith({ phase: 'verify', verifyStackKey: 'verify-outage-fallback' })
      expect(lastNavigatorRender().screen).toEqual({
        name: BCSCStacks.Verify,
        navigationKey: 'verify-outage-fallback',
      })
      expect(mockVerifyStackMount).toHaveBeenCalledTimes(1)

      rerenderWith(rerender, { phase: 'verify', verifyStackKey: 'verify' })

      expect(lastNavigatorRender().screen).toEqual({ name: BCSCStacks.Verify, navigationKey: 'verify' })
      // A fresh mount is what re-runs VerifyStack's resume-step routing
      expect(mockVerifyStackMount).toHaveBeenCalledTimes(2)
    })

    it('mounts the main stack under the id-token provider once verified, and bare before', () => {
      const { rerender, toJSON } = renderWith({ phase: 'main', isVerified: false })
      expect(toJSON()).toBe('MainStack')
      expect(mockIdTokenProviderRender).not.toHaveBeenCalled()

      rerenderWith(rerender, { phase: 'main', isVerified: true })

      expect(toJSON()).toBe('MainStack')
      expect(mockIdTokenProviderRender).toHaveBeenCalled()
    })

    it('tells the main stack whether the root cut to it, so a wait at mount shows at once', () => {
      const { rerender } = renderWith({ phase: 'main', transition: { animationEnabled: false } })
      expect(mockMainStackProps).toHaveBeenLastCalledWith({ enteredByCut: true })

      rerenderWith(rerender, { phase: 'main', transition: IDLE_ROOT_TRANSITION })

      expect(mockMainStackProps).toHaveBeenLastCalledWith({ enteredByCut: false })
    })

    it('animates the route the way the ViewModel decided, with the header hidden and the gesture off', () => {
      renderWith({ phase: 'main', transition: { animationEnabled: true, animationTypeForReplace: 'pop' } })

      expect(lastNavigatorRender().options).toEqual({
        headerShown: false,
        gestureEnabled: false,
        animationEnabled: true,
        animationTypeForReplace: 'pop',
      })
    })
  })

  describe('the session providers above the route', () => {
    const lastEnabled = () =>
      [mockAgentProviderRender, mockAccountProviderRender, mockSessionProviderRender].map(
        (provider) => provider.mock.lastCall?.[0]
      )

    it('are enabled for a session and disabled outside one', () => {
      const { rerender } = renderWith({ phase: 'main', inSession: true })
      expect(lastEnabled()).toEqual([true, true, true])

      rerenderWith(rerender, { phase: 'auth', inSession: false })

      expect(lastEnabled()).toEqual([false, false, false])
    })

    it('stay mounted across phase changes, so a session never restarts them', () => {
      const { rerender } = renderWith({ phase: 'main' })

      rerenderWith(rerender, { phase: 'verify' })
      rerenderWith(rerender, { phase: 'main' })
      rerenderWith(rerender, { phase: 'auth', inSession: false })

      expect(mockAgentProviderMount).toHaveBeenCalledTimes(1)
      expect(mockAccountProviderMount).toHaveBeenCalledTimes(1)
      expect(mockSessionProviderMount).toHaveBeenCalledTimes(1)
    })
  })

  describe('the invalid environment recovery gate', () => {
    it('stands in for the navigator and the session providers, whatever the phase', () => {
      const { toJSON } = renderWith({ showInvalidEnvironment: true, phase: 'main' })

      expect(toJSON()).toBe('InvalidEnvironment')
      expect(mockNavigatorRender).not.toHaveBeenCalled()
      expect(mockAgentProviderRender).not.toHaveBeenCalled()
      expect(mockAccountProviderRender).not.toHaveBeenCalled()
      expect(mockSessionProviderRender).not.toHaveBeenCalled()
    })

    it('gives way to the phase route once the environment is valid again', () => {
      const { rerender, toJSON } = renderWith({ showInvalidEnvironment: true, phase: 'onboarding', inSession: false })

      rerenderWith(rerender, { phase: 'onboarding', inSession: false })

      expect(toJSON()).toBe('OnboardingStack')
      expect(lastNavigatorRender().screen.name).toBe(BCSCStacks.Onboarding)
    })
  })

  describe('card expiry, synced to FCM from inside the main route', () => {
    const useStoreWith = (secure: Record<string, any>) =>
      jest.mocked(Bifold.useStore).mockReturnValue([mockStore(secure), jest.fn()] as any)
    const phaseLogs = () =>
      mockLogger.info.mock.calls.map(([message]) => message).filter((m) => String(m).includes('Card expiry phase'))

    it('tells FCM the card is expired when the stored refresh token expires', () => {
      const { rerender } = render(<BCSCRootStack />)
      expect(mockSetCardExpired).toHaveBeenLastCalledWith(false)

      useStoreWith({ refreshToken: EXPIRED_JWT })
      rerender(<BCSCRootStack />)

      expect(mockSetCardExpired).toHaveBeenLastCalledWith(true)
    })

    it('logs the phase once on first render', () => {
      render(<BCSCRootStack />)

      expect(phaseLogs()).toEqual(['[RootStack] Card expiry phase: unknown'])
    })

    it('logs only the phase, never a day count or date that would reveal the card expiry', () => {
      const inEightDays = new Date()
      inEightDays.setDate(inEightDays.getDate() + 8)
      mockAccount = { account_expiration_date: inEightDays }

      render(<BCSCRootStack />)

      expect(phaseLogs()).toEqual(['[RootStack] Card expiry phase: expiringSoon'])
      expect(String(phaseLogs()[0])).not.toMatch(/\d/)
    })

    it('logs again when the phase changes, and not on a re-render with the same phase', () => {
      const { rerender } = render(<BCSCRootStack />)

      useStoreWith({})
      rerender(<BCSCRootStack />)
      expect(phaseLogs()).toHaveLength(1)

      useStoreWith({ refreshToken: EXPIRED_JWT })
      rerender(<BCSCRootStack />)

      expect(phaseLogs()).toEqual(['[RootStack] Card expiry phase: unknown', '[RootStack] Card expiry phase: expired'])
    })
  })
})

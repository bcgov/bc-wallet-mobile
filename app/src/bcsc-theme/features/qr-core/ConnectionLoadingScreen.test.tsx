import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Connection, CredentialProvisioningEventTypes, LoadingPlaceholder } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { act, render } from '@testing-library/react-native'
import React from 'react'
import { BackHandler, DeviceEventEmitter } from 'react-native'

import ConnectionLoadingScreen from './ConnectionLoadingScreen'

const mockProvisioningMonitor = { workflowInProgress: false }

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@bifold/core', () => ({
  Connection: jest.fn().mockReturnValue(null),
  CredentialProvisioningEventTypes: {
    Started: 'CredentialProvisioningEvent.Started',
    Completed: 'CredentialProvisioningEvent.Completed',
    FailedHandleOffer: 'CredentialProvisioningEvent.FailedHandleOffer',
    FailedHandleProof: 'CredentialProvisioningEvent.FailedHandleProof',
    FailedRequestCredential: 'CredentialProvisioningEvent.FailedRequestCredential',
  },
  LoadingPlaceholder: jest.fn().mockReturnValue(null),
  LoadingPlaceholderWorkflowType: {
    Connection: 'Connection',
    ReceiveOffer: 'ReceiveOffer',
    ProofRequested: 'ProofRequested',
  },
  testIdWithKey: (key: string) => `com.ariesbifold:id/${key}`,
  TOKENS: { UTIL_CREDENTIAL_PROVISIONING_MONITOR: 'utility.credential-provisioning-monitor' },
  useServices: jest.fn(() => [mockProvisioningMonitor]),
  useTheme: jest.fn(() => ({ ColorPalette: { brand: { primaryBackground: '#000000' } } })),
}))
// `@react-navigation/native` isn't transformed by jest (see transformIgnorePatterns), so
// pull-through imports like NavigationContext come back as undefined. Spread the real module
// and supply a minimal NavigationContext shim — Provider just renders children — so the
// wrapping in ConnectionLoadingScreen works in tests.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContext: { Provider: ({ children }: any) => children },
}))

const ConnectionMock = Connection as jest.MockedFunction<typeof Connection>

const mkProps = (params: Record<string, string | undefined> = { oobRecordId: 'oob-1' }) => {
  const navigation = {
    dispatch: jest.fn(),
    navigate: jest.fn(),
    getParent: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    goBack: jest.fn(),
  } as any
  const route = { params } as any
  return { navigation, route }
}

describe('ConnectionLoadingScreen', () => {
  beforeEach(() => jest.clearAllMocks())

  it("renders Bifold's Connection screen with the oobRecordId from route params", () => {
    const { navigation, route } = mkProps()
    render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
    expect(ConnectionMock).toHaveBeenCalled()
    const props = ConnectionMock.mock.calls.at(-1)![0] as any
    expect(props.route.params.oobRecordId).toBe('oob-1')
  })

  it('passes an adapted navigation prop (proxy, not the raw navigation)', () => {
    const { navigation, route } = mkProps()
    render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
    const props = ConnectionMock.mock.calls.at(-1)![0] as any
    // The adapter is a Proxy — accessing `navigate` returns a function that intercepts
    // Bifold route names. Smoke-test by invoking with a Bifold-only route and confirming
    // it didn't pass through to the raw navigation.
    props.navigation.navigate('Tab Home Stack')
    expect(navigation.navigate).not.toHaveBeenCalled()
    expect(navigation.dispatch).toHaveBeenCalled()
  })

  it('exit calls from inside Bifold (proof-request share / decline) reset to BCSC Home', () => {
    // Bifold's ProofRequest + ProofRequestAccept exit paths call
    //   navigation.getParent()?.navigate('Tab Home Stack', { screen: 'Home' })
    // In production, NavigationContext.Provider makes useNavigation() inside
    // ProofRequestAccept return this same adapter. Drive that call through the
    // adapter prop the mocked Connection received and assert the underlying nav
    // sees the BCSC reset — proving the share/decline contract end-to-end.
    const { navigation, route } = mkProps()
    render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
    const props = ConnectionMock.mock.calls.at(-1)![0] as any
    props.navigation.getParent()?.navigate('Tab Home Stack', { screen: 'Home' })
    expect(navigation.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab, state: { routes: [{ name: BCSCScreens.Home }] } }],
      })
    )
  })

  // Bifold's Connection screen blocks the Android hardware back button. For
  // notification-opened offers / proof requests the header shows a back button
  // (see MainStack), so the wrapper registers its own higher-priority handler
  // to make the hardware button match.
  describe('hardware back handling', () => {
    it.each([{ credentialId: 'cred-1' }, { proofId: 'proof-1' }])(
      'pops the screen on hardware back when opened with %o',
      (params) => {
        const spy = jest.spyOn(BackHandler, 'addEventListener')
        const { navigation, route } = mkProps(params)
        render(<ConnectionLoadingScreen navigation={navigation} route={route} />)

        expect(spy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function))
        const handler = spy.mock.calls.at(-1)![1] as () => boolean
        expect(handler()).toBe(true)
        expect(navigation.goBack).toHaveBeenCalled()
      }
    )

    it('leaves hardware back alone for QR-scan (oobRecordId) entries', () => {
      const spy = jest.spyOn(BackHandler, 'addEventListener')
      const { navigation, route } = mkProps({ oobRecordId: 'oob-1' })
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)

      expect(spy).not.toHaveBeenCalled()
      expect(navigation.goBack).not.toHaveBeenCalled()
    })

    it('swallows hardware back instead of popping when there is nowhere to go back to', () => {
      const spy = jest.spyOn(BackHandler, 'addEventListener')
      const { navigation, route } = mkProps({ credentialId: 'cred-1' })
      navigation.canGoBack.mockReturnValue(false)
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)

      const handler = spy.mock.calls.at(-1)![1] as () => boolean
      expect(handler()).toBe(true)
      expect(navigation.goBack).not.toHaveBeenCalled()
    })
  })

  // The wrapper holds a loading overlay while AutoCredentialMonitor fetches a
  // missing credential in the background, because Bifold's Connection screen
  // has no provisioning gate and its ProofRequest registers listeners too late
  // to reliably catch Started.
  describe('credential provisioning gate', () => {
    const LoadingPlaceholderMock = LoadingPlaceholder as jest.MockedFunction<typeof LoadingPlaceholder>

    afterEach(() => {
      mockProvisioningMonitor.workflowInProgress = false
    })

    it('shows the overlay on Started and hides it on Completed', () => {
      const { navigation, route } = mkProps()
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
      expect(LoadingPlaceholderMock).not.toHaveBeenCalled()

      act(() => {
        DeviceEventEmitter.emit(CredentialProvisioningEventTypes.Started)
      })
      expect(LoadingPlaceholderMock).toHaveBeenCalled()

      LoadingPlaceholderMock.mockClear()
      act(() => {
        DeviceEventEmitter.emit(CredentialProvisioningEventTypes.Completed)
      })
      expect(LoadingPlaceholderMock).not.toHaveBeenCalled()
    })

    it.each([
      CredentialProvisioningEventTypes.FailedHandleProof,
      CredentialProvisioningEventTypes.FailedHandleOffer,
      CredentialProvisioningEventTypes.FailedRequestCredential,
    ])('hides the overlay on %s', (failureEvent) => {
      const { navigation, route } = mkProps()
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
      act(() => {
        DeviceEventEmitter.emit(CredentialProvisioningEventTypes.Started)
      })

      LoadingPlaceholderMock.mockClear()
      act(() => {
        DeviceEventEmitter.emit(failureEvent, new Error('provisioning failed'))
      })
      expect(LoadingPlaceholderMock).not.toHaveBeenCalled()
    })

    it('shows the overlay immediately when a workflow is already in progress at mount', () => {
      // DeviceEventEmitter has no replay: a Started emitted before this screen
      // mounts (e.g. entry from a home notification) would otherwise be missed.
      mockProvisioningMonitor.workflowInProgress = true
      const { navigation, route } = mkProps()
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
      expect(LoadingPlaceholderMock).toHaveBeenCalled()
    })
  })
})

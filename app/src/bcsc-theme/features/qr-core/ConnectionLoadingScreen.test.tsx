import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Connection, CredentialProvisioningEventTypes } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { act, render, screen } from '@testing-library/react-native'
import React from 'react'
import { BackHandler, DeviceEventEmitter } from 'react-native'

import ConnectionLoadingScreen from './ConnectionLoadingScreen'

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
  LoadingPlaceholder: ({ workflowType }: { workflowType: string }) => {
    const { Text } = jest.requireActual('react-native')
    return <Text>{`LoadingPlaceholder:${workflowType}`}</Text>
  },
  LoadingPlaceholderWorkflowType: { Connection: 'Connection', ProofRequested: 'ProofRequested' },
  TOKENS: { UTIL_CREDENTIAL_PROVISIONING_MONITOR: 'UTIL_CREDENTIAL_PROVISIONING_MONITOR' },
  useServices: jest.fn().mockReturnValue([undefined]),
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

  describe('credential provisioning loading gate', () => {
    it('renders Connection (not the loading placeholder) when no monitor is registered', () => {
      const { useServices } = jest.requireMock('@bifold/core')
      useServices.mockReturnValue([undefined])
      const { navigation, route } = mkProps()
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
      expect(screen.queryByText('LoadingPlaceholder:Connection')).toBeNull()
      expect(ConnectionMock).toHaveBeenCalled()
    })

    it('renders the loading placeholder instead of Connection while a workflow is already in progress', () => {
      const { useServices } = jest.requireMock('@bifold/core')
      useServices.mockReturnValue([{ workflowInProgress: true }])
      const { navigation, route } = mkProps()
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
      expect(screen.getByText('LoadingPlaceholder:Connection')).toBeTruthy()
      expect(ConnectionMock).not.toHaveBeenCalled()
    })

    it('switches to the loading placeholder on Started and back to Connection on Completed', () => {
      const { useServices } = jest.requireMock('@bifold/core')
      useServices.mockReturnValue([{ workflowInProgress: false }])
      const { navigation, route } = mkProps()
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)
      expect(ConnectionMock).toHaveBeenCalledTimes(1)

      act(() => {
        DeviceEventEmitter.emit(CredentialProvisioningEventTypes.Started)
      })
      expect(screen.getByText('LoadingPlaceholder:Connection')).toBeTruthy()

      act(() => {
        DeviceEventEmitter.emit(CredentialProvisioningEventTypes.Completed)
      })
      expect(screen.queryByText('LoadingPlaceholder:Connection')).toBeNull()
      expect(ConnectionMock).toHaveBeenCalledTimes(2)
    })

    it('clears the loading placeholder on a failure event too', () => {
      const { useServices } = jest.requireMock('@bifold/core')
      useServices.mockReturnValue([{ workflowInProgress: false }])
      const { navigation, route } = mkProps()
      render(<ConnectionLoadingScreen navigation={navigation} route={route} />)

      act(() => {
        DeviceEventEmitter.emit(CredentialProvisioningEventTypes.Started)
      })
      expect(screen.getByText('LoadingPlaceholder:Connection')).toBeTruthy()

      act(() => {
        DeviceEventEmitter.emit(CredentialProvisioningEventTypes.FailedRequestCredential)
      })
      expect(screen.queryByText('LoadingPlaceholder:Connection')).toBeNull()
    })
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
})

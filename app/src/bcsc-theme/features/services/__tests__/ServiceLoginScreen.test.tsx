import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BasicAppContext } from '../../../../../__mocks__/helpers/app'
import { BCSCScreens, BCSCStacks } from '../../../types/navigators'
import { ServiceLoginScreen } from '../ServiceLoginScreen'

jest.mock('../hooks/useServiceLoginState', () => ({
  useServiceLoginState: jest.fn(),
}))

jest.mock('@/bcsc-theme/api/hooks/useApi', () => {
  const pairing = { loginByPairingCode: jest.fn() }
  return () => ({
    pairing,
    metadata: {},
  })
})

jest.mock('@/bcsc-theme/hooks/useQuickLoginUrl', () => ({
  useQuickLoginURL: () => jest.fn(),
}))

const mockDeepLinkViewModel = {
  hasPendingDeepLink: false,
  consumePendingDeepLink: jest.fn(),
}

jest.mock('../../deep-linking', () => {
  const actual = jest.requireActual('../../deep-linking')
  return {
    ...actual,
    useDeepLinkViewModel: () => mockDeepLinkViewModel,
  }
})

const mockUseServiceLoginState = jest.requireMock('../hooks/useServiceLoginState').useServiceLoginState as jest.Mock

const baseRoute = {
  key: 'ServiceLogin',
  name: BCSCScreens.ServiceLogin,
  params: {},
} as any

describe('ServiceLoginScreen snapshots', () => {
  const getPairingMock = () => {
    const api = jest.requireMock('@/bcsc-theme/api/hooks/useApi')
    return api().pairing as { loginByPairingCode: jest.Mock }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDeepLinkViewModel.hasPendingDeepLink = false
    mockDeepLinkViewModel.consumePendingDeepLink = jest.fn()
    getPairingMock().loginByPairingCode.mockReset()
  })

  it('renders loading state', () => {
    mockUseServiceLoginState.mockReturnValue({
      state: {},
      isLoading: true,
      serviceHydrated: false,
    })

    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={navigation as never} route={baseRoute} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders unavailable state', () => {
    mockUseServiceLoginState.mockReturnValue({
      state: {
        serviceTitle: 'BC Parks',
        serviceClientUri: 'https://example.com',
      },
      isLoading: false,
      serviceHydrated: true,
    })

    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={navigation as never} route={baseRoute} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders default state for deep link', () => {
    mockUseServiceLoginState.mockReturnValue({
      state: {
        serviceTitle: 'BC Parks',
        claimsDescription: 'Name, Email',
        privacyPolicyUri: 'https://example.com/privacy',
        pairingCode: 'CODE123',
        serviceInitiateLoginUri: 'https://example.com/login',
      },
      isLoading: false,
      serviceHydrated: true,
    })

    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={navigation as never} route={baseRoute} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders default state for quick login, with privacy policy', () => {
    mockUseServiceLoginState.mockReturnValue({
      state: {
        serviceTitle: 'BC Parks',
        claimsDescription: 'Name, Email',
        privacyPolicyUri: 'https://example.com/privacy',
        serviceInitiateLoginUri: 'https://example.com/login',
      },
      isLoading: false,
      serviceHydrated: true,
    })

    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={navigation as never} route={baseRoute} />
      </BasicAppContext>
    )

    const cancelButton = tree.getByTestId(testIdWithKey('ServiceLoginCancel'))
    expect(cancelButton).toBeDefined()

    const continueButton = tree.getByTestId(testIdWithKey('ServiceLoginContinue'))
    expect(continueButton).toBeDefined()

    const privacyPolicyLink = tree.getByTestId(testIdWithKey('ReadPrivacyPolicy'))
    expect(privacyPolicyLink).toBeDefined()

    expect(tree).toMatchSnapshot()
  })

  it('renders default state for quick login, without privacy policy', () => {
    mockUseServiceLoginState.mockReturnValue({
      state: {
        serviceTitle: 'BC Parks',
        claimsDescription: 'Name, Email',
        serviceInitiateLoginUri: 'https://example.com/login',
      },
      isLoading: false,
      serviceHydrated: true,
    })

    const navigation = useNavigation()
    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={navigation as never} route={baseRoute} />
      </BasicAppContext>
    )

    const cancelButton = tree.getByTestId(testIdWithKey('ServiceLoginCancel'))
    expect(cancelButton).toBeDefined()

    const continueButton = tree.getByTestId(testIdWithKey('ServiceLoginContinue'))
    expect(continueButton).toBeDefined()

    expect(tree.queryByTestId(testIdWithKey('ReadPrivacyPolicy'))).toBeNull()
    expect(tree).toMatchSnapshot()
  })

  it('cancels to Home when no back stack or pending deep link', () => {
    mockUseServiceLoginState.mockReturnValue({
      state: {
        serviceTitle: 'BC Parks',
        claimsDescription: 'Name, Email',
        serviceInitiateLoginUri: 'https://example.com/login',
      },
      isLoading: false,
      serviceHydrated: true,
    })
    const navigation = useNavigation()
    navigation.canGoBack = jest.fn().mockReturnValue(false)

    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={navigation as never} route={baseRoute} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId(testIdWithKey('ServiceLoginCancel')))

    expect(navigation.goBack).not.toHaveBeenCalled()
    expect(navigation.navigate).toHaveBeenCalledWith(BCSCStacks.Tab, { screen: BCSCScreens.Home })
    expect(navigation.navigate).toHaveBeenCalledTimes(1)
  })

  it('clears pending deep link on cancel when present', () => {
    mockDeepLinkViewModel.hasPendingDeepLink = true
    const consumePendingDeepLink = jest.fn()
    mockDeepLinkViewModel.consumePendingDeepLink = consumePendingDeepLink

    mockUseServiceLoginState.mockReturnValue({
      state: {
        serviceTitle: 'BC Parks',
        claimsDescription: 'Name, Email',
        serviceInitiateLoginUri: 'https://example.com/login',
      },
      isLoading: false,
      serviceHydrated: true,
    })

    const navigation = useNavigation()
    navigation.canGoBack = jest.fn().mockReturnValue(false)

    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={navigation as never} route={baseRoute} />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId(testIdWithKey('ServiceLoginCancel')))

    expect(consumePendingDeepLink).toHaveBeenCalledTimes(1)
    expect(navigation.goBack).not.toHaveBeenCalled()
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it('navigates to PairingConfirmation when pairing code succeeds', async () => {
    mockUseServiceLoginState.mockReturnValue({
      state: {
        serviceTitle: 'BC Parks',
        claimsDescription: 'Name, Email',
        pairingCode: 'CODE123',
        serviceInitiateLoginUri: 'https://example.com/login',
      },
      isLoading: false,
      serviceHydrated: true,
    })

    const navigation = useNavigation()
    const pairing = getPairingMock()
    pairing.loginByPairingCode.mockResolvedValue({
      client_ref_id: 'service-123',
      client_name: 'BC Parks',
    })

    const tree = render(
      <BasicAppContext>
        <ServiceLoginScreen navigation={navigation as never} route={baseRoute} />
      </BasicAppContext>
    )

    await fireEvent.press(tree.getByTestId(testIdWithKey('ServiceLoginContinue')))

    expect(pairing.loginByPairingCode).toHaveBeenCalledWith('CODE123')
    expect(navigation.navigate).toHaveBeenCalledWith(BCSCScreens.PairingConfirmation, {
      serviceId: 'service-123',
      serviceName: 'BC Parks',
    })
  })
})

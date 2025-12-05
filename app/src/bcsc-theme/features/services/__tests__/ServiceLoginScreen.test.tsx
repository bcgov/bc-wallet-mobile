import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { render } from '@testing-library/react-native'
import React from 'react'
import { BasicAppContext } from '../../../../../__mocks__/helpers/app'
import { BCSCScreens } from '../../../types/navigators'
import { ServiceLoginScreen } from '../ServiceLoginScreen'

jest.mock('../hooks/useServiceLoginState', () => ({
  useServiceLoginState: jest.fn(),
}))

jest.mock('@/bcsc-theme/api/hooks/useApi', () => () => ({
  pairing: { loginByPairingCode: jest.fn() },
  metadata: {},
}))

jest.mock('@/bcsc-theme/hooks/useQuickLoginUrl', () => ({
  useQuickLoginURL: () => jest.fn(),
}))

jest.mock('../../deep-linking', () => ({
  useDeepLinkViewModel: () => ({
    hasPendingDeepLink: false,
    consumePendingDeepLink: jest.fn(),
  }),
}))

const mockUseServiceLoginState = jest.requireMock('../hooks/useServiceLoginState').useServiceLoginState as jest.Mock

const baseRoute = {
  key: 'ServiceLogin',
  name: BCSCScreens.ServiceLogin,
  params: {},
} as any

describe('ServiceLoginScreen snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})

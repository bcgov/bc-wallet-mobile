import { render } from '@testing-library/react-native'
import React from 'react'

import { DeepLinkViewModel, DeepLinkViewModelProvider } from '@/bcsc-theme/features/deep-linking'
import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import { ServiceLoginScreen } from '../../src/bcsc-theme/features/services/ServiceLoginScreen'

const createMockViewModel = () =>
  ({
    hasPendingDeepLink: false,
    consumePendingDeepLink: jest.fn(),
    initialize: jest.fn(),
    onNavigationRequest: jest.fn(() => () => {}),
    onPendingStateChange: jest.fn(() => () => {}),
  } as unknown as DeepLinkViewModel)

describe('ServiceLogin', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const route = { params: { serviceClient: { client_id: 'test-client' } } }
    const tree = render(
      <BasicAppContext>
        <DeepLinkViewModelProvider viewModel={createMockViewModel()}>
          <ServiceLoginScreen navigation={mockNavigation as never} route={route as never} />
        </DeepLinkViewModelProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})

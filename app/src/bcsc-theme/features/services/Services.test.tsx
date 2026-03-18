import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { useFilterServiceClients } from './hooks/useFilterServiceClients'
import Services from './Services'

jest.mock('@/bcsc-theme/hooks/useDataLoader', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: undefined,
    load: jest.fn(),
    isLoading: false,
  })),
}))

jest.mock('@/bcsc-theme/services/hooks/useTokenService', () => ({
  useTokenService: jest.fn(() => ({
    getCachedIdTokenMetadata: jest.fn(),
  })),
}))

jest.mock('./hooks/useFilterServiceClients', () => ({
  useFilterServiceClients: jest.fn(),
}))

const mockedUseFilterServiceClients = useFilterServiceClients as jest.MockedFunction<typeof useFilterServiceClients>

describe('Services', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders loading indicator when services are loading', () => {
    mockedUseFilterServiceClients.mockReturnValue({
      serviceClients: [],
      isLoading: true,
    })

    const tree = render(
      <BasicAppContext>
        <Services />
      </BasicAppContext>
    )

    expect(tree.getByTestId('com.ariesbifold:id/ServicesLoading')).toBeTruthy()
    expect(tree).toMatchSnapshot()
  })

  it('renders service list when loading is complete', () => {
    mockedUseFilterServiceClients.mockReturnValue({
      serviceClients: [
        {
          client_ref_id: 'test-1',
          client_name: 'Test Service',
          client_description: 'A test service',
          client_uri: 'https://example.com',
          application_type: 'web',
          claims_description: '',
          suppress_confirmation_info: false,
          suppress_bookmark_prompt: false,
          allowed_identification_processes: [],
          bc_address: false,
        },
      ],
      isLoading: false,
    })

    const tree = render(
      <BasicAppContext>
        <Services />
      </BasicAppContext>
    )

    expect(tree.queryByTestId('com.ariesbifold:id/ServicesLoading')).toBeNull()
    expect(tree.getByText('Test Service')).toBeTruthy()
    expect(tree).toMatchSnapshot()
  })
})

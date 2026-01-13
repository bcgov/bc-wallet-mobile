import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { CreatePINScreen } from './CreatePINScreen'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn().mockResolvedValue(false),
  setPIN: jest.fn(),
  AccountSecurityMethod: {
    PinNoDeviceAuth: 'app_pin_no_device_authn',
    PinWithDeviceAuth: 'app_pin_has_device_authn',
    DeviceAuth: 'device_authentication',
  },
}))

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient', () => ({
  useBCSCApiClientState: () => ({
    client: {},
    isClientReady: true,
  }),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({
    handleSuccessfulAuth: jest.fn(),
  }),
}))

jest.mock('@/bcsc-theme/api/hooks/useRegistrationApi', () => ({
  __esModule: true,
  default: () => ({
    register: jest.fn(),
  }),
}))

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
} as any

describe('CreatePINScreen snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <CreatePINScreen navigation={mockNavigation} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})

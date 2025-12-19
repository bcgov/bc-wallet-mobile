import { render } from '@testing-library/react-native'
import React from 'react'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import { EnterPINScreen } from '../../src/bcsc-theme/features/auth/EnterPINScreen'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn().mockResolvedValue(false),
  getAccountSecurityMethod: jest.fn().mockResolvedValue('app_pin_no_device_authn'),
  isAccountLocked: jest.fn().mockResolvedValue({ locked: false, remainingTime: 0 }),
  unlockWithDeviceSecurity: jest.fn().mockResolvedValue({ success: false, walletKey: '' }),
  verifyPIN: jest.fn().mockResolvedValue({ success: false, walletKey: '', locked: false, message: 'Incorrect PIN' }),
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

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: () => ({
    startLoading: jest.fn(),
    stopLoading: jest.fn(),
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

describe('EnterPINScreen snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <EnterPINScreen navigation={mockNavigation} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})

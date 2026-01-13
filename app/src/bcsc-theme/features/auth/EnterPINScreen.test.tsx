import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import {
  AccountSecurityMethod,
  canPerformDeviceAuthentication,
  getAccountSecurityMethod,
  isAccountLocked,
  unlockWithDeviceSecurity,
} from 'react-native-bcsc-core'
import { EnterPINScreen } from './EnterPINScreen'

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

const mockHandleSuccessfulAuth = jest.fn()

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient', () => ({
  useBCSCApiClientState: () => ({
    client: {},
    isClientReady: true,
  }),
}))

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({
    handleSuccessfulAuth: mockHandleSuccessfulAuth,
  }),
}))

jest.mock('@/bcsc-theme/contexts/BCSCLoadingContext', () => ({
  useLoadingScreen: () => ({
    startLoading: jest.fn(),
    stopLoading: jest.fn(),
  }),
}))

const mockGetAccountSecurityMethod = jest.mocked(getAccountSecurityMethod)
const mockIsAccountLocked = jest.mocked(isAccountLocked)
const mockCanPerformDeviceAuthentication = jest.mocked(canPerformDeviceAuthentication)
const mockUnlockWithDeviceSecurity = jest.mocked(unlockWithDeviceSecurity)

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

describe('EnterPINScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Default to PIN mode, not locked
    mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
    mockIsAccountLocked.mockResolvedValue({ locked: false, remainingTime: 0 })
    mockCanPerformDeviceAuthentication.mockResolvedValue(false)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('snapshots', () => {
    it('renders correctly', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('Enter your 6-digit PIN')).toBeTruthy()
      })

      expect(tree).toMatchSnapshot()
    })
  })

  describe('initialization - locked account', () => {
    it('navigates to Lockout screen when account is locked', async () => {
      mockIsAccountLocked.mockResolvedValue({ locked: true, remainingTime: 60 })

      render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'RESET',
            payload: expect.objectContaining({
              routes: [{ name: 'BCSCLockout' }],
            }),
          })
        )
      })
    })
  })

  describe('initialization - device auth mode', () => {
    it('attempts device authentication when method is DeviceAuth and auth succeeds', async () => {
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockUnlockWithDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'test-key' })

      render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockUnlockWithDeviceSecurity).toHaveBeenCalledWith('Unlock your app')
      })

      await waitFor(() => {
        expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('test-key')
      })
    })

    it('goes back when device authentication fails or is cancelled', async () => {
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockUnlockWithDeviceSecurity.mockResolvedValue({ success: false, walletKey: '' })

      render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled()
      })
    })

    it('navigates to DeviceAuthAppReset when device auth is not available', async () => {
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      mockCanPerformDeviceAuthentication.mockResolvedValue(false)

      render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCDeviceAuthAppReset')
      })
    })

    it('goes back when device authentication throws an error', async () => {
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.DeviceAuth)
      mockCanPerformDeviceAuthentication.mockRejectedValue(new Error('Device auth error'))

      render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled()
      })
    })
  })

  describe('UI elements', () => {
    it('renders Get Help button', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('Get Help')).toBeTruthy()
      })
    })

    it('renders Continue button', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByTestId('com.ariesbifold:id/Continue')).toBeTruthy()
      })
    })

    it('renders PIN input with accessibility hint', async () => {
      const tree = render(
        <BasicAppContext>
          <EnterPINScreen navigation={mockNavigation} />
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByA11yHint('Enter your 6-digit PIN')).toBeTruthy()
      })
    })
  })
})

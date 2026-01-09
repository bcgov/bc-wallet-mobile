import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAccountSecurityMethod,
  getAvailableBiometricType,
} from 'react-native-bcsc-core'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import { ChangeSecurityScreen } from '../../src/bcsc-theme/features/auth/ChangeSecurityScreen'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn(),
  getAvailableBiometricType: jest.fn(),
  performDeviceAuthentication: jest.fn(),
  setupDeviceSecurity: jest.fn(),
  getAccountSecurityMethod: jest.fn(),
  setAccountSecurityMethod: jest.fn(),
  BiometricType: {
    None: 'none',
    FaceID: 'face id',
    TouchID: 'touch id',
    Fingerprint: 'fingerprint',
  },
  AccountSecurityMethod: {
    PinNoDeviceAuth: 'app_pin_no_device_authn',
    PinWithDeviceAuth: 'app_pin_has_device_authn',
    DeviceAuth: 'device_authentication',
  },
}))

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}))

jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: () => ({
    error: jest.fn(),
    clearError: jest.fn(),
  }),
}))

const mockCanPerformDeviceAuthentication = jest.mocked(canPerformDeviceAuthentication)
const mockGetAvailableBiometricType = jest.mocked(getAvailableBiometricType)
const mockGetAccountSecurityMethod = jest.mocked(getAccountSecurityMethod)

describe('ChangeSecurityScreen', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('when current method is PIN and device auth is available', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.PinWithDeviceAuth)
    })

    it('renders security options with current method indicator', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
      })

      // Should show current method indicator
      expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('shows both Device Auth and PIN options', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
      })

      // Should show both options
      expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()
    })

    it('disables PIN option when current method is PIN', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
      })

      // The PIN option should show "Currently active"
      expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentlySelected')).toBeTruthy()
    })
  })

  describe('when current method is Device Auth', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.DeviceAuth)
    })

    it('shows Device Auth as current method', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
      })

      expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('navigates to ChangePIN screen when PIN option is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()
      })

      const pinButton = tree.getByTestId('com.ariesbifold:id/CardButton-BCSC.Onboarding.SecureAppPINTitle')
      fireEvent.press(pinButton)

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BCSCMainChangePIN')
    })
  })

  describe('when device auth is NOT available', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(false)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.None)
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.PinNoDeviceAuth)
    })

    it('shows message that device auth is not available', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
      })

      expect(tree.getByText('BCSC.Settings.AppSecurity.DeviceAuthNotSetup')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })
  })
})

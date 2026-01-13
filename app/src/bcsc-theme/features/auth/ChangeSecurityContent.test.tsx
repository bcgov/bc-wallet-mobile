import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAccountSecurityMethod,
  getAvailableBiometricType,
  performDeviceAuthentication,
  setAccountSecurityMethod,
  setupDeviceSecurity,
} from 'react-native-bcsc-core'
import Toast from 'react-native-toast-message'

import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { ChangeSecurityContent } from './ChangeSecurityContent'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn(),
  getAvailableBiometricType: jest.fn(),
  performDeviceAuthentication: jest.fn().mockResolvedValue(true),
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

const mockError = jest.fn()

jest.mock('@/contexts/ErrorAlertContext', () => ({
  useErrorAlert: () => ({
    error: mockError,
    clearError: jest.fn(),
  }),
}))

const mockCanPerformDeviceAuthentication = jest.mocked(canPerformDeviceAuthentication)
const mockGetAvailableBiometricType = jest.mocked(getAvailableBiometricType)
const mockGetAccountSecurityMethod = jest.mocked(getAccountSecurityMethod)
const mockPerformDeviceAuthentication = jest.mocked(performDeviceAuthentication)
const mockSetupDeviceSecurity = jest.mocked(setupDeviceSecurity)
const mockSetAccountSecurityMethod = jest.mocked(setAccountSecurityMethod)
const mockToastShow = jest.mocked(Toast.show)

describe('ChangeSecurityContent', () => {
  let mockNavigation = useNavigation()
  let onDeviceAuthSuccess = mockNavigation['goBack']
  let onLearnMorePressed = mockNavigation['navigate']
  let onPINPress = mockNavigation['navigate']

  beforeEach(() => {
    mockNavigation = useNavigation()
    onDeviceAuthSuccess = mockNavigation.goBack
    onLearnMorePressed = mockNavigation.navigate
    onPINPress = mockNavigation.navigate
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
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
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
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
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
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
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
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
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
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()
      })

      const pinButton = tree.getByTestId('com.ariesbifold:id/CardButton-BCSC.Onboarding.SecureAppPINTitle')
      fireEvent.press(pinButton)

      expect(onPINPress).toHaveBeenCalled()
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
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
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

  describe('error handling', () => {
    it('shows error when loading security method fails', async () => {
      mockGetAccountSecurityMethod.mockRejectedValue(new Error('Failed to load'))
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)

      render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith(
          'BCSC.Settings.AppSecurity.ErrorTitle',
          'BCSC.Settings.AppSecurity.SetupFailedMessage'
        )
      })
    })
  })

  describe('switching to Device Auth', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.PinWithDeviceAuth)
      mockPerformDeviceAuthentication.mockResolvedValue(true)
    })

    it('successfully switches to device auth and shows toast', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'key', isAutoGenerated: true })
      mockSetAccountSecurityMethod.mockResolvedValue(true)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(
        'com.ariesbifold:id/CardButton-BCSC.Onboarding.SecureAppDeviceAuthTitle'
      )
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockSetupDeviceSecurity).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockSetAccountSecurityMethod).toHaveBeenCalledWith(AccountSecurityMethod.DeviceAuth)
      })

      await waitFor(() => {
        expect(onDeviceAuthSuccess).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockToastShow).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            text1: 'BCSC.Settings.AppSecurity.SuccessTitle',
          })
        )
      })
    })

    it('shows error when device security setup fails', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: false, walletKey: '' } as any)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(
        'com.ariesbifold:id/CardButton-BCSC.Onboarding.SecureAppDeviceAuthTitle'
      )
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith(
          'BCSC.Settings.AppSecurity.ErrorTitle',
          'BCSC.Settings.AppSecurity.SetupFailedMessage'
        )
      })

      // Should not navigate
      expect(onDeviceAuthSuccess).not.toHaveBeenCalled()
    })

    it('shows error when setAccountSecurityMethod throws', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'key' } as any)
      mockSetAccountSecurityMethod.mockRejectedValue(new Error('Failed to set method'))

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(
        'com.ariesbifold:id/CardButton-BCSC.Onboarding.SecureAppDeviceAuthTitle'
      )
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith(
          'BCSC.Settings.AppSecurity.ErrorTitle',
          'BCSC.Settings.AppSecurity.SetupFailedMessage'
        )
      })
    })
  })

  describe('Learn More', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockGetAccountSecurityMethod.mockResolvedValue(AccountSecurityMethod.PinWithDeviceAuth)
    })

    it('navigates to WebView when Learn More is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent
              onDeviceAuthSuccess={onDeviceAuthSuccess}
              onLearnMorePress={onLearnMorePressed}
              onPINPress={onPINPress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.LearnMore')).toBeTruthy()
      })

      const learnMoreButton = tree.getByTestId('com.ariesbifold:id/CardButton-BCSC.Onboarding.LearnMore')
      fireEvent.press(learnMoreButton)

      expect(onLearnMorePressed).toHaveBeenCalled()
    })
  })
})

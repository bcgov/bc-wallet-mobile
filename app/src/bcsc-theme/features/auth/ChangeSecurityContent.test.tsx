import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import * as walletServiceHooks from '@/bcsc-theme/services/hooks/useWalletService'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
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

const mockAlert = jest.fn()

jest.mock('@/contexts/ErrorAlertContext', () => {
  const actual = jest.requireActual('@/contexts/ErrorAlertContext')
  return {
    ...actual,
    useErrorAlert: () => ({
      emitAlert: mockAlert,
      clearError: jest.fn(),
    }),
  }
})

const mockCanPerformDeviceAuthentication = jest.mocked(canPerformDeviceAuthentication)
const mockGetAvailableBiometricType = jest.mocked(getAvailableBiometricType)
const mockGetAccountSecurityMethod = jest.mocked(getAccountSecurityMethod)
const mockPerformDeviceAuthentication = jest.mocked(performDeviceAuthentication)
const mockSetupDeviceSecurity = jest.mocked(setupDeviceSecurity)
const mockSetAccountSecurityMethod = jest.mocked(setAccountSecurityMethod)

describe('ChangeSecurityContent', () => {
  let mockNavigation = useNavigation()
  let onDeviceAuthSuccess = mockNavigation['goBack']
  let onPINPress = mockNavigation['navigate']

  beforeEach(() => {
    mockNavigation = useNavigation()
    onDeviceAuthSuccess = mockNavigation.goBack
    onPINPress = mockNavigation.navigate
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
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
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
      })

      // Should show current method indicator
      expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('shows both Device Auth and PIN options', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
      })

      // Device auth is the actionable option; PIN is shown as the current method.
      expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      expect(tree.getByTestId(testIdWithKey('ChoosePINButton'))).toBeTruthy()
    })

    it('marks PIN as the current method when current method is PIN', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
      })

      // The PIN card shows the current-method label with the PIN name as its subtext.
      expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      expect(tree.getByText('BCSC.Settings.AppSecurity.PIN')).toBeTruthy()
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
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
      })

      expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('navigates to ChangePIN screen when PIN option is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()
      })

      const pinButton = tree.getByTestId(testIdWithKey('ChoosePINButton'))
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
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
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
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
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

    it('successfully switches to device auth and rotates the wallet key', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'key', isAutoGenerated: true })
      mockSetAccountSecurityMethod.mockResolvedValue(true)
      const mockRotateWalletKey = jest.fn().mockResolvedValue(true)
      jest.spyOn(walletServiceHooks, 'useWalletService').mockReturnValue({ rotateWalletKey: mockRotateWalletKey })

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockSetupDeviceSecurity).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockSetAccountSecurityMethod).toHaveBeenCalledWith(AccountSecurityMethod.DeviceAuth)
      })

      await waitFor(() => {
        expect(mockRotateWalletKey).toHaveBeenCalledWith('key')
      })

      await waitFor(() => {
        expect(onDeviceAuthSuccess).toHaveBeenCalled()
      })
    })

    it('shows error when device security setup fails', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: false, walletKey: '' } as any)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
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
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'BCSC.Settings.AppSecurity.ErrorTitle',
          'BCSC.Settings.AppSecurity.SetupFailedMessage'
        )
      })
    })
  })
})

import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { testIdWithKey } from '@bifold/core'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAvailableBiometricType,
  performDeviceAuthentication,
} from 'react-native-bcsc-core'
import { BasicAppContext } from '../../../../../__mocks__/helpers/app'
import { SecurityMethodSelector } from './SecurityMethodSelector'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn(),
  getAvailableBiometricType: jest.fn(),
  performDeviceAuthentication: jest.fn(),
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

const mockCanPerformDeviceAuthentication = jest.mocked(canPerformDeviceAuthentication)
const mockGetAvailableBiometricType = jest.mocked(getAvailableBiometricType)
const mockPerformDeviceAuthentication = jest.mocked(performDeviceAuthentication)

describe('SecurityMethodSelector', () => {
  const mockOnDeviceAuthPress = jest.fn()
  const mockOnPINPress = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('when device auth is available', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
    })

    it('renders both device auth and PIN options', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
      })

      expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingDeviceAuthTitle')).toBeTruthy()
      expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()
      expect(tree.queryByTestId(testIdWithKey('LearnMoreButton'))).toBeNull()
      expect(tree).toMatchSnapshot()
    })

    it('shows description content', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingContent')).toBeTruthy()
      })
    })

    it('calls onPINPress when PIN option is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()
      })

      const pinButton = tree.getByTestId(testIdWithKey('ChoosePINButton'))
      fireEvent.press(pinButton)

      expect(mockOnPINPress).toHaveBeenCalled()
    })

    it('calls performDeviceAuthentication when device auth option is pressed', async () => {
      mockPerformDeviceAuthentication.mockResolvedValue(true)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockPerformDeviceAuthentication).toHaveBeenCalled()
      })
    })

    it('calls onDeviceAuthPress after successful device authentication', async () => {
      mockPerformDeviceAuthentication.mockResolvedValue(true)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockOnDeviceAuthPress).toHaveBeenCalled()
      })
    })
  })

  describe('when device auth is NOT available', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(false)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.None)
    })

    it('renders PIN-only view with buttons', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
      })

      // Should show no device auth content
      expect(tree.getByText('BCSC.Onboarding.SecureAppNoDeviceAuthContent1')).toBeTruthy()
      expect(tree.getByText('BCSC.Onboarding.SecureAppNoDeviceAuthContent2')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('renders PIN-only view (no Learn More button in onboarding)', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByTestId(testIdWithKey('ChoosePINButton'))).toBeTruthy()
      })

      expect(tree.queryByTestId(testIdWithKey('LearnMoreButton'))).toBeNull()
    })

    it('calls onPINPress when PIN button is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByTestId(testIdWithKey('ChoosePINButton'))).toBeTruthy()
      })

      const pinButton = tree.getByTestId(testIdWithKey('ChoosePINButton'))
      fireEvent.press(pinButton)

      expect(mockOnPINPress).toHaveBeenCalled()
    })
  })

  describe('in settings context (with currentMethod)', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
    })

    it('shows current method indicator when currentMethod is provided', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              currentMethod={AccountSecurityMethod.PinWithDeviceAuth}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      })
    })

    it('marks the PIN card as the current method', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              currentMethod={AccountSecurityMethod.PinWithDeviceAuth}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      })

      // The PIN card shows the current-method label with the PIN name as its subtext, while device
      // auth becomes the actionable option.
      expect(tree.getByText('BCSC.Settings.AppSecurity.PIN')).toBeTruthy()
      expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()

      // Accessibility: the current-method card must announce the method name (its subtext), be
      // marked selected (not disabled), and be a non-interactive status indicator.
      const pinCard = tree.getByTestId(testIdWithKey('ChoosePINButton'))
      expect(pinCard.props.accessibilityLabel).toContain('BCSC.Settings.AppSecurity.PIN')
      expect(pinCard.props.accessibilityState).toMatchObject({ selected: true })
      expect(pinCard.props.accessibilityState.disabled).toBeFalsy()
      expect(pinCard.props.accessibilityRole).toBeUndefined()
      expect(pinCard.props.onPress).toBeUndefined()
    })

    it('marks the device auth card as the current method', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              currentMethod={AccountSecurityMethod.DeviceAuth}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      })

      // Device auth shows the current-method label; creating a PIN becomes the actionable option.
      expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()

      // Accessibility: the biometric name (subtext) is part of the current-method card's label and
      // the card is marked selected rather than disabled.
      const deviceAuthCard = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      expect(deviceAuthCard.props.accessibilityLabel).toMatch(/Face/)
      expect(deviceAuthCard.props.accessibilityState).toMatchObject({ selected: true })
      expect(deviceAuthCard.props.accessibilityState.disabled).toBeFalsy()

      expect(tree).toMatchSnapshot()
    })

    it('uses custom device auth prompt when provided', async () => {
      mockPerformDeviceAuthentication.mockResolvedValue(true)

      const customPrompt = 'Custom authenticate prompt'
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              currentMethod={AccountSecurityMethod.PinWithDeviceAuth}
              deviceAuthPrompt={customPrompt}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockPerformDeviceAuthentication).toHaveBeenCalledWith(customPrompt)
      })
    })
  })

  describe('settings context when device auth is NOT available', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(false)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.None)
    })

    it('shows device auth not setup message', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              currentMethod={AccountSecurityMethod.PinNoDeviceAuth}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.DeviceAuthNotSetup')).toBeTruthy()
      })
    })
  })

  describe('error handling', () => {
    it('handles error when loading device auth info', async () => {
      mockCanPerformDeviceAuthentication.mockRejectedValue(new Error('Failed to check device auth'))
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.None)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      // Should fall back to device auth not available state
      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppNoDeviceAuthContent1')).toBeTruthy()
      })
    })

    it('handles device authentication failure gracefully', async () => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockPerformDeviceAuthentication.mockResolvedValue(false)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockPerformDeviceAuthentication).toHaveBeenCalled()
      })

      // Should not call onDeviceAuthPress if authentication failed
      expect(mockOnDeviceAuthPress).not.toHaveBeenCalled()
    })

    it('handles device authentication error gracefully', async () => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockPerformDeviceAuthentication.mockRejectedValue(new Error('Biometric error'))

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockPerformDeviceAuthentication).toHaveBeenCalled()
      })

      // Should not call onDeviceAuthPress if authentication threw error
      expect(mockOnDeviceAuthPress).not.toHaveBeenCalled()
    })

    it('handles onDeviceAuthPress error gracefully', async () => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockPerformDeviceAuthentication.mockResolvedValue(true)
      mockOnDeviceAuthPress.mockRejectedValue(new Error('Parent handler error'))

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingDeviceAuthTitle')).toBeTruthy()
      })

      const deviceAuthButton = tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton'))
      fireEvent.press(deviceAuthButton)

      await waitFor(() => {
        expect(mockOnDeviceAuthPress).toHaveBeenCalled()
      })

      // Should not crash - error is caught and logged
    })

    it('shows Device Passcode label when biometric type is None', async () => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.None)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector onDeviceAuthPress={mockOnDeviceAuthPress} onPINPress={mockOnPINPress} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingDeviceAuthTitle')).toBeTruthy()
      })
    })
  })
})

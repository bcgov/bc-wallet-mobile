import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAvailableBiometricType,
  performDeviceAuthentication,
} from 'react-native-bcsc-core'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import { SecurityMethodSelector } from '../../src/bcsc-theme/features/auth/components/SecurityMethodSelector'

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
  const mockOnLearnMorePress = jest.fn()

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
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
      })

      expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()
      expect(tree.getByText('BCSC.Onboarding.LearnMore')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('shows description content', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppContent')).toBeTruthy()
      })
    })

    it('calls onPINPress when PIN option is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppPINTitle')).toBeTruthy()
      })

      const pinButton = tree.getByTestId('com.ariesbifold:id/CardButton-BCSC.Onboarding.SecureAppPINTitle')
      fireEvent.press(pinButton)

      expect(mockOnPINPress).toHaveBeenCalled()
    })

    it('calls performDeviceAuthentication when device auth option is pressed', async () => {
      mockPerformDeviceAuthentication.mockResolvedValue(true)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
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
        expect(mockPerformDeviceAuthentication).toHaveBeenCalled()
      })
    })

    it('calls onDeviceAuthPress after successful device authentication', async () => {
      mockPerformDeviceAuthentication.mockResolvedValue(true)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
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
        expect(mockOnDeviceAuthPress).toHaveBeenCalled()
      })
    })

    it('calls onLearnMorePress when learn more option is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.LearnMore')).toBeTruthy()
      })

      const learnMoreButton = tree.getByTestId('com.ariesbifold:id/CardButton-BCSC.Onboarding.LearnMore')
      fireEvent.press(learnMoreButton)

      expect(mockOnLearnMorePress).toHaveBeenCalled()
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
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
      })

      // Should show no device auth content
      expect(tree.getByText('BCSC.Onboarding.SecureAppNoDeviceAuthContent1')).toBeTruthy()
      expect(tree.getByText('BCSC.Onboarding.SecureAppNoDeviceAuthContent2')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('renders PIN and Learn More buttons', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByTestId('ChoosePINButton')).toBeTruthy()
        expect(tree.getByTestId('LearnMoreButton')).toBeTruthy()
      })
    })

    it('calls onPINPress when PIN button is pressed', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByTestId('ChoosePINButton')).toBeTruthy()
      })

      const pinButton = tree.getByTestId('ChoosePINButton')
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
              onLearnMorePress={mockOnLearnMorePress}
              currentMethod={AccountSecurityMethod.PinWithDeviceAuth}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentMethod')).toBeTruthy()
      })
    })

    it('disables current method option (PIN)', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
              currentMethod={AccountSecurityMethod.PinWithDeviceAuth}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentlySelected')).toBeTruthy()
      })
    })

    it('disables current method option (Device Auth)', async () => {
      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
              currentMethod={AccountSecurityMethod.DeviceAuth}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.CurrentlySelected')).toBeTruthy()
      })

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
              onLearnMorePress={mockOnLearnMorePress}
              currentMethod={AccountSecurityMethod.PinWithDeviceAuth}
              deviceAuthPrompt={customPrompt}
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
              onLearnMorePress={mockOnLearnMorePress}
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
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
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
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
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
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
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
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
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
            <SecurityMethodSelector
              onDeviceAuthPress={mockOnDeviceAuthPress}
              onPINPress={mockOnPINPress}
              onLearnMorePress={mockOnLearnMorePress}
            />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })
    })
  })
})

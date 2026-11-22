import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import * as walletServiceHooks from '@/bcsc-theme/services/hooks/useWalletService'
import { getBCSCState, useAccount } from '@/bcsc-theme/storage/hooks'
import type { BCSCStoreSeed } from '@/bcsc-theme/storage/testing'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAvailableBiometricType,
  performDeviceAuthentication,
  setupDeviceSecurity,
} from 'react-native-bcsc-core'
import { ChangeSecurityContent } from './ChangeSecurityContent'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn(),
  getAvailableBiometricType: jest.fn(),
  performDeviceAuthentication: jest.fn().mockResolvedValue(true),
  setupDeviceSecurity: jest.fn(),
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
const mockPerformDeviceAuthentication = jest.mocked(performDeviceAuthentication)
const mockSetupDeviceSecurity = jest.mocked(setupDeviceSecurity)

const pinAccount = { accountId: 'test-account-id', issuer: 'https://idsit.gov.bc.ca/device/' }

// BasicAppContext resets the store, so the account goes in through it
const accountSeed = (securityMethod: AccountSecurityMethod): BCSCStoreSeed => ({
  account: { profile: { ...pinAccount, clientId: 'test-client-id', securityMethod } },
})

/** Shows the method held in secure state, so a test can watch the store follow the switch. */
const SecureStateProbe = () => {
  const securityMethod = useAccount((s) => s.profile?.securityMethod)
  return <Text>{securityMethod ?? 'unknown'}</Text>
}

/** Records a switch to PIN in secure state, as the PIN screen does when it finishes. */
const RecordPINSwitch = () => {
  const { updateProfile } = useAccount()
  const recordSwitch = () => void updateProfile({ securityMethod: AccountSecurityMethod.PinWithDeviceAuth })
  return <Text onPress={recordSwitch}>record PIN switch</Text>
}

describe('ChangeSecurityContent', () => {
  let mockNavigation = useNavigation()
  let onDeviceAuthSuccess = mockNavigation['goBack']
  let onPINPress = mockNavigation['navigate']
  let seed = accountSeed(AccountSecurityMethod.PinWithDeviceAuth)

  beforeEach(() => {
    seed = accountSeed(AccountSecurityMethod.PinWithDeviceAuth)
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
      seed = accountSeed(AccountSecurityMethod.PinWithDeviceAuth)
    })

    it('renders security options with current method indicator', async () => {
      const tree = render(
        <BasicAppContext bcscState={seed}>
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
        <BasicAppContext bcscState={seed}>
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
        <BasicAppContext bcscState={seed}>
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
      seed = accountSeed(AccountSecurityMethod.DeviceAuth)
    })

    it('shows Device Auth as current method', async () => {
      const tree = render(
        <BasicAppContext bcscState={seed}>
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

    it('moves the marker to PIN when the switch is recorded with the screen already open', async () => {
      // Backing out of the PIN screen mid-switch returns here before the switch is recorded
      const tree = render(
        <BasicAppContext bcscState={accountSeed(AccountSecurityMethod.DeviceAuth)}>
          <BCSCLoadingProvider>
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
            <RecordPINSwitch />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.DeviceAuth')).toBeTruthy()
      })

      fireEvent.press(tree.getByText('record PIN switch'))

      await waitFor(() => {
        expect(tree.getByText('BCSC.Settings.AppSecurity.PIN')).toBeTruthy()
      })
      expect(tree.queryByText('BCSC.Settings.AppSecurity.DeviceAuth')).toBeNull()
    })

    it('navigates to ChangePIN screen when PIN option is pressed', async () => {
      const tree = render(
        <BasicAppContext bcscState={seed}>
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
      seed = accountSeed(AccountSecurityMethod.PinNoDeviceAuth)
    })

    it('shows message that device auth is not available', async () => {
      const tree = render(
        <BasicAppContext bcscState={seed}>
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

  describe('switching to Device Auth', () => {
    beforeEach(() => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      seed = accountSeed(AccountSecurityMethod.PinWithDeviceAuth)
      mockPerformDeviceAuthentication.mockResolvedValue(true)
    })

    it('successfully switches to device auth and rotates the wallet key', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'key', isAutoGenerated: true })
      const mockRotateWalletKey = jest.fn().mockResolvedValue(true)
      jest.spyOn(walletServiceHooks, 'useWalletService').mockReturnValue({ rotateWalletKey: mockRotateWalletKey })

      const tree = render(
        <BasicAppContext bcscState={seed}>
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
        expect(mockSetupDeviceSecurity).toHaveBeenCalledWith(pinAccount)
      })

      await waitFor(() => {
        expect(getBCSCState().account.profile?.securityMethod).toBe(AccountSecurityMethod.DeviceAuth)
      })

      await waitFor(() => {
        expect(mockRotateWalletKey).toHaveBeenCalledWith('key')
      })

      await waitFor(() => {
        expect(onDeviceAuthSuccess).toHaveBeenCalled()
      })
    })

    it('records the switch in secure state, so Settings drops Change PIN at once', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'key', isAutoGenerated: true })
      jest
        .spyOn(walletServiceHooks, 'useWalletService')
        .mockReturnValue({ rotateWalletKey: jest.fn().mockResolvedValue(true) })

      const tree = render(
        <BasicAppContext bcscState={seed}>
          <BCSCLoadingProvider>
            <ChangeSecurityContent onDeviceAuthSuccess={onDeviceAuthSuccess} onPINPress={onPINPress} />
            <SecureStateProbe />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      await waitFor(() => {
        expect(tree.getByText('BCSC.Onboarding.SecureAppDeviceAuthTitle')).toBeTruthy()
      })
      expect(tree.getByText(AccountSecurityMethod.PinWithDeviceAuth)).toBeTruthy()

      fireEvent.press(tree.getByTestId(testIdWithKey('ChooseDeviceAuthButton')))

      await waitFor(() => {
        expect(tree.getByText(AccountSecurityMethod.DeviceAuth)).toBeTruthy()
      })
    })

    it('shows error when device security setup fails', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: false, walletKey: '' } as any)

      const tree = render(
        <BasicAppContext bcscState={seed}>
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

    it('shows error when saving the security method fails', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'key' } as any)
      const failingSeed = accountSeed(AccountSecurityMethod.PinWithDeviceAuth)
      seed = {
        account: {
          ...failingSeed.account,
          updateProfile: jest.fn().mockRejectedValue(new Error('Failed to set method')),
        },
      }

      const tree = render(
        <BasicAppContext bcscState={seed}>
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

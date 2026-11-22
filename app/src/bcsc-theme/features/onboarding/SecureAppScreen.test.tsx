import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { getBCSCState, useAccount } from '@/bcsc-theme/storage/hooks'
import type { BCSCStoreSeed } from '@/bcsc-theme/storage/testing'
import { TestIds } from '@/test-ids/registry'
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
import { SecureAppScreen } from './SecureAppScreen'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn(),
  getAvailableBiometricType: jest.fn(),
  performDeviceAuthentication: jest.fn(),
  setupDeviceSecurity: jest.fn(),
  isBcscNativeError: jest.fn().mockReturnValue(false),
  BcscNativeErrorCodes: {
    KEYPAIR_GENERATION_FAILED: 'E_KEYPAIR_GENERATION_FAILED',
  },
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

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient', () => ({
  useBCSCApiClient: () => ({
    endpoints: { issuer: 'https://mock-issuer' },
  }),
  useBCSCApiClientState: () => ({
    client: {},
    isClientReady: true,
  }),
}))

const mockHandleSuccessfulAuth = jest.fn()

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({
    handleSuccessfulAuth: mockHandleSuccessfulAuth,
  }),
}))

jest.mock('@/bcsc-theme/api/hooks/useRegistrationApi', () => ({
  __esModule: true,
  default: () => ({
    register: jest.fn(),
  }),
}))

const mockCanPerformDeviceAuthentication = jest.mocked(canPerformDeviceAuthentication)
const mockGetAvailableBiometricType = jest.mocked(getAvailableBiometricType)
const mockPerformDeviceAuthentication = jest.mocked(performDeviceAuthentication)
const mockSetupDeviceSecurity = jest.mocked(setupDeviceSecurity)

/** Shows the method held in secure state, so a test can watch the store follow the switch. */
const SecureStateProbe = () => {
  const securityMethod = useAccount((s) => s.profile?.securityMethod)
  return <Text>{securityMethod ?? 'unknown'}</Text>
}

describe('SecureApp', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly when device auth is NOT available', async () => {
    mockCanPerformDeviceAuthentication.mockResolvedValue(false)
    mockGetAvailableBiometricType.mockResolvedValue(BiometricType.None)

    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <SecureAppScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
    })

    expect(tree).toMatchSnapshot()
  })

  it('renders correctly when device auth IS available', async () => {
    mockCanPerformDeviceAuthentication.mockResolvedValue(true)
    mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)

    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <SecureAppScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree.getByText('BCSC.Onboarding.SecureAppOnboardingHeader')).toBeTruthy()
    })

    expect(tree).toMatchSnapshot()
  })

  describe('choosing device authentication', () => {
    const existingProfile = {
      accountId: 'existing-account-id',
      clientId: 'existing-client-id',
      issuer: 'https://existing-issuer',
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
    }
    // BasicAppContext resets the store, so the account goes in through it
    const existingAccount: BCSCStoreSeed = { account: { profile: existingProfile } }

    const pressDeviceAuth = async (bcscState?: BCSCStoreSeed) => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockPerformDeviceAuthentication.mockResolvedValue(true)

      const tree = render(
        <BasicAppContext bcscState={bcscState}>
          <BCSCLoadingProvider>
            <SecureAppScreen navigation={mockNavigation as never} />
            <SecureStateProbe />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      const button = await waitFor(() => tree.getByTestId(testIdWithKey(TestIds.onboarding.secureApp.chooseDeviceAuth)))
      fireEvent.press(button)
      return tree
    }

    it('creates the placeholder account when none exists and hands it on to be saved', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'wallet-key' } as never)

      await pressDeviceAuth()

      await waitFor(() =>
        expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('wallet-key', {
          accountId: expect.any(String),
          clientId: '',
          issuer: 'https://mock-issuer',
          securityMethod: AccountSecurityMethod.DeviceAuth,
        })
      )
      const created = mockHandleSuccessfulAuth.mock.calls[0][1]
      expect(mockSetupDeviceSecurity).toHaveBeenCalledWith({
        accountId: created.accountId,
        issuer: 'https://mock-issuer',
      })
      // handleSuccessfulAuth saves it, mocked here
      expect(getBCSCState().account.profile).toBeUndefined()
    })

    it('keeps an existing account and sets the security method after device security succeeds', async () => {
      let methodDuringSetup: AccountSecurityMethod | undefined
      mockSetupDeviceSecurity.mockImplementation(async () => {
        methodDuringSetup = getBCSCState().account.profile?.securityMethod
        return { success: true, walletKey: 'wallet-key' } as never
      })

      const tree = await pressDeviceAuth(existingAccount)

      await waitFor(() => expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('wallet-key', undefined))
      expect(mockSetupDeviceSecurity).toHaveBeenCalledWith({
        accountId: existingProfile.accountId,
        issuer: existingProfile.issuer,
      })
      expect(methodDuringSetup).toBe(AccountSecurityMethod.PinNoDeviceAuth)
      expect(getBCSCState().account.profile).toEqual({
        ...existingProfile,
        securityMethod: AccountSecurityMethod.DeviceAuth,
      })
      expect(tree.getByText(AccountSecurityMethod.DeviceAuth)).toBeTruthy()
    })

    it('leaves an existing account untouched when device security setup fails', async () => {
      mockSetupDeviceSecurity.mockResolvedValue({ success: false, walletKey: '' } as never)

      await pressDeviceAuth(existingAccount)

      await waitFor(() => expect(mockSetupDeviceSecurity).toHaveBeenCalled())
      expect(getBCSCState().account.profile).toEqual(existingProfile)
      expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
    })
  })
})

import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import {
  AccountSecurityMethod,
  BiometricType,
  canPerformDeviceAuthentication,
  getAccount,
  getAvailableBiometricType,
  performDeviceAuthentication,
  setAccount,
  setAccountSecurityMethod,
  setupDeviceSecurity,
} from 'react-native-bcsc-core'
import { SecureAppScreen } from './SecureAppScreen'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn(),
  getAvailableBiometricType: jest.fn(),
  performDeviceAuthentication: jest.fn(),
  setupDeviceSecurity: jest.fn(),
  getAccount: jest.fn(),
  setAccount: jest.fn(),
  setAccountSecurityMethod: jest.fn(),
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
const mockGetAccount = jest.mocked(getAccount)
const mockSetAccount = jest.mocked(setAccount)
const mockSetAccountSecurityMethod = jest.mocked(setAccountSecurityMethod)

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
    const existingAccount = {
      clientID: 'existing-client-id',
      issuer: 'https://existing-issuer',
      securityMethod: AccountSecurityMethod.PinNoDeviceAuth,
    }

    const pressDeviceAuth = async () => {
      mockCanPerformDeviceAuthentication.mockResolvedValue(true)
      mockGetAvailableBiometricType.mockResolvedValue(BiometricType.FaceID)
      mockPerformDeviceAuthentication.mockResolvedValue(true)

      const tree = render(
        <BasicAppContext>
          <BCSCLoadingProvider>
            <SecureAppScreen navigation={mockNavigation as never} />
          </BCSCLoadingProvider>
        </BasicAppContext>
      )

      const button = await waitFor(() => tree.getByTestId(testIdWithKey(TestIds.onboarding.secureApp.chooseDeviceAuth)))
      fireEvent.press(button)
    }

    it('creates the placeholder account when none exists, before setting up device security', async () => {
      mockGetAccount.mockResolvedValue(null)
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'wallet-key' } as never)

      await pressDeviceAuth()

      await waitFor(() => expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('wallet-key'))
      expect(mockSetAccount).toHaveBeenCalledWith({
        clientID: '',
        issuer: 'https://mock-issuer',
        securityMethod: AccountSecurityMethod.DeviceAuth,
      })
      expect(mockSetAccount.mock.invocationCallOrder[0]).toBeLessThan(
        mockSetupDeviceSecurity.mock.invocationCallOrder[0]
      )
      expect(mockSetAccountSecurityMethod).not.toHaveBeenCalled()
    })

    it('keeps an existing account and sets the security method after device security succeeds', async () => {
      mockGetAccount.mockResolvedValue(existingAccount as never)
      mockSetupDeviceSecurity.mockResolvedValue({ success: true, walletKey: 'wallet-key' } as never)

      await pressDeviceAuth()

      await waitFor(() => expect(mockHandleSuccessfulAuth).toHaveBeenCalledWith('wallet-key'))
      expect(mockSetAccount).not.toHaveBeenCalled()
      expect(mockSetAccountSecurityMethod).toHaveBeenCalledWith(AccountSecurityMethod.DeviceAuth)
      expect(mockSetupDeviceSecurity.mock.invocationCallOrder[0]).toBeLessThan(
        mockSetAccountSecurityMethod.mock.invocationCallOrder[0]
      )
    })

    it('leaves an existing account untouched when device security setup fails', async () => {
      mockGetAccount.mockResolvedValue(existingAccount as never)
      mockSetupDeviceSecurity.mockResolvedValue({ success: false, walletKey: '' } as never)

      await pressDeviceAuth()

      await waitFor(() => expect(mockSetupDeviceSecurity).toHaveBeenCalled())
      expect(mockSetAccount).not.toHaveBeenCalled()
      expect(mockSetAccountSecurityMethod).not.toHaveBeenCalled()
      expect(mockHandleSuccessfulAuth).not.toHaveBeenCalled()
    })
  })
})

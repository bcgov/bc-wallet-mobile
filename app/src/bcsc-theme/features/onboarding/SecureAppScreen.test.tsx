import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { BiometricType, canPerformDeviceAuthentication, getAvailableBiometricType } from 'react-native-bcsc-core'
import { SecureAppScreen } from './SecureAppScreen'

jest.mock('react-native-bcsc-core', () => ({
  canPerformDeviceAuthentication: jest.fn(),
  getAvailableBiometricType: jest.fn(),
  performDeviceAuthentication: jest.fn(),
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

jest.mock('@/bcsc-theme/api/hooks/useRegistrationApi', () => ({
  __esModule: true,
  default: () => ({
    register: jest.fn(),
  }),
}))

const mockCanPerformDeviceAuthentication = jest.mocked(canPerformDeviceAuthentication)
const mockGetAvailableBiometricType = jest.mocked(getAvailableBiometricType)

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
      expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
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
      expect(tree.getByText('BCSC.Onboarding.SecureAppHeader')).toBeTruthy()
    })

    expect(tree).toMatchSnapshot()
  })
})

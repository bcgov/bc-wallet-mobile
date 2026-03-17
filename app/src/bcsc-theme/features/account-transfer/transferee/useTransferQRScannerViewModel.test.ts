import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import * as Bifold from '@bifold/core'
import { QrCodeScanError } from '@bifold/core'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import useTransferQRScannerViewModel from './useTransferQRScannerViewModel'

const mockAuthorizeDevice = jest.fn().mockResolvedValue(null)
const mockVerifyAttestation = jest.fn().mockResolvedValue({ success: true })
const mockDeviceToken = jest.fn().mockResolvedValue({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
})
const mockUseApi = jest.mocked(useApi)

const mockUpdateTokens = jest.fn()
const mockUpdateUserInfo = jest.fn()
const mockUpdateDeviceCodes = jest.fn()

jest.mock('@/bcsc-theme/hooks/useSecureActions')
const mockUseSecureActions = jest.mocked(useSecureActions)

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
const mockUseBCSCApiClient = jest.mocked(useBCSCApiClient)

jest.mock('@/hooks/useAutoRequestPermission', () => ({
  useAutoRequestPermission: jest.fn(() => ({ isLoading: false })),
}))

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

const mockNavigation = {
  navigate: jest.fn(),
  dispatch: jest.fn(),
} as any

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

const mockApiClient = { tokens: null } as any

const mockAccount = {
  issuer: 'https://issuer.example.com',
  clientID: 'test-client-id',
}

const mockDeviceAuth = {
  device_code: 'test-device-code',
  user_code: 'ABCD1234',
  verified_email: 'test@example.com',
  expires_in: 3600,
}

const validQrValue = 'https://example.com?mock-attestation-token'

describe('useTransferQRScannerViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseApi.mockReturnValue({
      authorization: { authorizeDevice: mockAuthorizeDevice },
      deviceAttestation: { verifyAttestation: mockVerifyAttestation },
      token: { deviceToken: mockDeviceToken },
    } as any)

    mockUseSecureActions.mockReturnValue({
      updateTokens: mockUpdateTokens,
      updateUserInfo: mockUpdateUserInfo,
      updateDeviceCodes: mockUpdateDeviceCodes,
    } as any)

    mockUseBCSCApiClient.mockReturnValue(mockApiClient)

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([{ bcscSecure: {} } as any, jest.fn()])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)

    jest.mocked(getAccount).mockResolvedValue(mockAccount as any)
    jest.mocked(createDeviceSignedJWT).mockResolvedValue('mock-jwt')
  })

  describe('device registration', () => {
    it('should register device on mount when no device code exists', async () => {
      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      await waitFor(() => {
        expect(mockAuthorizeDevice).toHaveBeenCalled()
        expect(mockUpdateDeviceCodes).toHaveBeenCalledWith({
          deviceCode: mockDeviceAuth.device_code,
          userCode: mockDeviceAuth.user_code,
          deviceCodeExpiresAt: expect.any(Date),
        })
      })
    })

    it('should skip registration when device code already exists', async () => {
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([{ bcscSecure: { deviceCode: 'existing-code' } } as any, jest.fn()])

      renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      await waitFor(() => {
        expect(mockAuthorizeDevice).not.toHaveBeenCalled()
      })
    })
  })

  describe('handleScan', () => {
    it('should wait for device registration before processing scan', async () => {
      let resolveRegistration: () => void
      const registrationPromise = new Promise<typeof mockDeviceAuth>((resolve) => {
        resolveRegistration = () => resolve(mockDeviceAuth)
      })
      mockAuthorizeDevice.mockReturnValue(registrationPromise)

      const { result } = renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      // Start scan before registration completes
      let scanPromise: Promise<void>
      act(() => {
        scanPromise = result.current.handleScan(validQrValue)
      })

      // Verify attestation hasn't been called yet (waiting for registration)
      expect(mockVerifyAttestation).not.toHaveBeenCalled()

      // Complete registration
      await act(async () => {
        resolveRegistration!()
        await scanPromise
      })

      // Now attestation should have proceeded
      await waitFor(() => {
        expect(mockVerifyAttestation).toHaveBeenCalled()
        expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationSuccess)
      })
    })

    it('should complete full scan flow successfully', async () => {
      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      // Wait for registration to complete
      await waitFor(() => {
        expect(mockAuthorizeDevice).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.handleScan(validQrValue)
      })

      expect(mockVerifyAttestation).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: mockAccount.clientID,
          device_code: mockDeviceAuth.device_code,
          attestation: 'mock-attestation-token',
        })
      )
      expect(mockDeviceToken).toHaveBeenCalled()
      expect(mockUpdateTokens).toHaveBeenCalledWith({
        refreshToken: 'mock-refresh-token',
        accessToken: 'mock-access-token',
      })
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationSuccess)
    })

    it('should set scanError for invalid QR code without token', async () => {
      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)

      const { result } = renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      await waitFor(() => {
        expect(mockAuthorizeDevice).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.handleScan('https://example.com')
      })

      expect(result.current.scanError).toBeInstanceOf(QrCodeScanError)
      expect(mockVerifyAttestation).not.toHaveBeenCalled()
    })

    it('should set scanError when getAccount returns null', async () => {
      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)
      jest.mocked(getAccount).mockResolvedValue(null as any)

      const { result } = renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      await waitFor(() => {
        expect(mockAuthorizeDevice).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.handleScan(validQrValue)
      })

      expect(result.current.scanError).toBeInstanceOf(QrCodeScanError)
    })

    it('should preserve QrCodeScanError without re-wrapping', async () => {
      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)
      jest.mocked(getAccount).mockResolvedValue(null as any)

      const { result } = renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      await waitFor(() => {
        expect(mockAuthorizeDevice).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.handleScan(validQrValue)
      })

      // The error message should be the translation key, not a wrapped version
      expect(result.current.scanError?.message).toBe('BCSC.Scan.InvalidQrCode')
    })

    it('should handle non-Error throws with String fallback', async () => {
      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)
      mockVerifyAttestation.mockRejectedValue('raw string error')

      const { result } = renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      await waitFor(() => {
        expect(mockAuthorizeDevice).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.handleScan(validQrValue)
      })

      expect(result.current.scanError).toBeInstanceOf(QrCodeScanError)
      expect(result.current.scanError?.details).toBe('raw string error')
    })
  })

  describe('dismissError', () => {
    it('should clear scanError', async () => {
      mockAuthorizeDevice.mockResolvedValue(mockDeviceAuth)
      jest.mocked(getAccount).mockResolvedValue(null as any)

      const { result } = renderHook(() => useTransferQRScannerViewModel(mockNavigation))

      await waitFor(() => {
        expect(mockAuthorizeDevice).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.handleScan(validQrValue)
      })

      expect(result.current.scanError).not.toBeNull()

      act(() => {
        result.current.dismissError()
      })

      expect(result.current.scanError).toBeNull()
    })
  })
})

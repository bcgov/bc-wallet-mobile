import { renderHook } from '@testing-library/react-native'
import BCSCApiClient from '../../../src/bcsc-theme/api/client'
import useDeviceAttestationApi, {
  VerifyAttestationPayload,
} from '../../../src/bcsc-theme/api/hooks/useDeviceAttestationApi'

describe('useDeviceAttestationApi', () => {
  let mockApiClient: jest.Mocked<BCSCApiClient>
  let mockAxiosResponse: any

  beforeEach(() => {
    mockAxiosResponse = {
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {},
      data: {},
    }

    mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
      endpoints: {
        attestation: '/attestation',
        token: '/oauth/token',
      },
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('verifyAttestation', () => {
    it('should successfully verify attestation and return true for status 201', async () => {
      const mockPayload: VerifyAttestationPayload = {
        client_id: 'mock_client_id',
        device_code: 'mock_device_code',
        attestation: 'mock_attestation_jwt',
        client_assertion: 'mock_client_assertion_jwt',
      }

      mockApiClient.post.mockResolvedValue(mockAxiosResponse)

      const { result } = renderHook(() => useDeviceAttestationApi(mockApiClient))
      const response = await result.current.verifyAttestation(mockPayload)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/attestation',
        {
          client_id: 'mock_client_id',
          device_code: 'mock_device_code',
          attestation: 'mock_attestation_jwt',
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: 'mock_client_assertion_jwt',
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        }
      )

      expect(response).toBe(true)
    })

    it('should return false for non-201 status responses', async () => {
      const mockPayload: VerifyAttestationPayload = {
        client_id: 'mock_client_id',
        device_code: 'mock_device_code',
        attestation: 'mock_attestation_jwt',
        client_assertion: 'mock_client_assertion_jwt',
      }

      const failureResponse = {
        ...mockAxiosResponse,
        status: 400,
        statusText: 'Bad Request',
      }

      mockApiClient.post.mockResolvedValue(failureResponse)

      const { result } = renderHook(() => useDeviceAttestationApi(mockApiClient))
      const response = await result.current.verifyAttestation(mockPayload)

      expect(response).toBe(false)
    })

    it('should throw error when BCSC client is not ready', async () => {
      const mockPayload: VerifyAttestationPayload = {
        client_id: 'mock_client_id',
        device_code: 'mock_device_code',
        attestation: 'mock_attestation_jwt',
        client_assertion: 'mock_client_assertion_jwt',
      }

      const { result } = renderHook(() => useDeviceAttestationApi(null))

      await expect(result.current.verifyAttestation(mockPayload)).rejects.toThrow(
        'BCSC client not ready for Device Attestation!'
      )
    })
  })

  describe('checkAttestationStatus', () => {
    it('should return true for successful attestation status check (status 200)', async () => {
      const mockJwtID = 'mock_jwt_id_123'
      const successResponse = {
        ...mockAxiosResponse,
        status: 200,
        statusText: 'OK',
      }

      mockApiClient.get.mockResolvedValue(successResponse)

      const { result } = renderHook(() => useDeviceAttestationApi(mockApiClient))
      const response = await result.current.checkAttestationStatus(mockJwtID)

      expect(mockApiClient.get).toHaveBeenCalledWith('/attestation/mock_jwt_id_123', {})
      expect(response).toBe(true)
    })

    it('should return undefined for non-200 status responses', async () => {
      const mockJwtID = 'mock_jwt_id_123'
      const notFoundResponse = {
        ...mockAxiosResponse,
        status: 404,
        statusText: 'Not Found',
      }

      mockApiClient.get.mockResolvedValue(notFoundResponse)

      const { result } = renderHook(() => useDeviceAttestationApi(mockApiClient))
      const response = await result.current.checkAttestationStatus(mockJwtID)

      expect(response).toBeFalsy()
    })

    it('should throw error when BCSC client is not ready', async () => {
      const mockJwtID = 'mock_jwt_id_123'

      const { result } = renderHook(() => useDeviceAttestationApi(null))

      await expect(result.current.checkAttestationStatus(mockJwtID)).rejects.toThrow(
        'BCSC client not ready for Device Attestation!'
      )
    })
  })
})

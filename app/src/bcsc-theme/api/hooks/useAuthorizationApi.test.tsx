import useAuthorizationApi from '@/bcsc-theme/api/hooks/useAuthorizationApi'
import { act, renderHook } from '@testing-library/react-native'
import moment from 'moment'
import * as BcscCore from 'react-native-bcsc-core'

const IAS_SCOPE = 'openid profile email address offline_access'
const DEVICE_AUTH_ENDPOINT = '/device/devicecode'
const FAKE_CLIENT_ID = 'client-uuid-1234'

const buildMockApiClient = () => ({
  post: jest.fn().mockResolvedValue({ data: {} }),
  endpoints: { deviceAuthorization: DEVICE_AUTH_ENDPOINT },
})

const renderAuthApi = (apiClient: ReturnType<typeof buildMockApiClient>) =>
  renderHook(() => useAuthorizationApi(apiClient as any)).result.current

describe('useAuthorizationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(BcscCore.getAccount).mockResolvedValue({ clientID: FAKE_CLIENT_ID } as any)
  })

  describe('authorizeDevice', () => {
    it('posts the form-encoded body to the deviceAuthorization endpoint with skipBearerAuth', async () => {
      const apiClient = buildMockApiClient()
      const api = renderAuthApi(apiClient)

      await act(async () => {
        await api.authorizeDevice('C82643367', new Date(1995, 11, 17))
      })

      expect(apiClient.post).toHaveBeenCalledWith(
        DEVICE_AUTH_ENDPOINT,
        expect.objectContaining({
          response_type: 'device_code',
          client_id: FAKE_CLIENT_ID,
          card_serial_number: 'C82643367',
          birth_date: '1995-12-17',
          scope: IAS_SCOPE,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        }
      )
    })

    it('formats birth_date from local-time components, not UTC (regression: TZ-shift card_not_found)', async () => {
      // Production constructs birthdate via moment(...).toDate() — local-midnight on whatever
      // device runs the app. The OLD impl used .toISOString().split('T')[0] which converts to
      // UTC and shifts the date back a day for any TZ east of UTC (Sauce Labs cloud devices,
      // travelers outside BC). IAS then can't find the card and returns card_not_found.
      const apiClient = buildMockApiClient()
      const api = renderAuthApi(apiClient)
      const userEnteredDate = moment('1995-12-17', 'YYYY-MM-DD').toDate()

      await act(async () => {
        await api.authorizeDevice('C82643367', userEnteredDate)
      })

      expect(apiClient.post).toHaveBeenCalledWith(
        DEVICE_AUTH_ENDPOINT,
        expect.objectContaining({ birth_date: '1995-12-17' }),
        expect.anything()
      )
    })

    it('omits card_serial_number and birth_date when neither is provided (transfer flow)', async () => {
      const apiClient = buildMockApiClient()
      const api = renderAuthApi(apiClient)

      await act(async () => {
        await api.authorizeDevice()
      })

      expect(apiClient.post).toHaveBeenCalledWith(
        DEVICE_AUTH_ENDPOINT,
        expect.objectContaining({
          response_type: 'device_code',
          client_id: FAKE_CLIENT_ID,
          card_serial_number: undefined,
          birth_date: undefined,
          scope: IAS_SCOPE,
        }),
        expect.anything()
      )
    })

    it('throws when a serial is provided without a birthdate', async () => {
      const apiClient = buildMockApiClient()
      const api = renderAuthApi(apiClient)

      await act(async () => {
        await expect(api.authorizeDevice('C82643367')).rejects.toThrow(
          'Birthdate is required when providing a serial number'
        )
      })
      expect(apiClient.post).not.toHaveBeenCalled()
    })

    it('returns the response data from IAS', async () => {
      const apiClient = buildMockApiClient()
      const mockResponse = {
        device_code: 'dev-abc',
        user_code: 'USER1234',
        verified_email: 'a****1@gmail.com',
        attestation_uri: 'https://example/attest',
        verification_options: 'video_call back_check',
        process: 'photo',
        expires_in: 600,
      }
      apiClient.post.mockResolvedValueOnce({ data: mockResponse })

      const api = renderAuthApi(apiClient)
      let result: any
      await act(async () => {
        result = await api.authorizeDevice('C82643367', new Date(1995, 11, 17))
      })

      expect(result).toEqual(mockResponse)
    })
  })

  describe('authorizeDeviceWithUnknownBCSC', () => {
    const baseConfig = {
      firstName: 'Velma',
      lastName: 'Dinkley',
      birthdate: '1995-12-17',
      address: {
        streetAddress: '123 Main St',
        postalCode: 'V6B 1A1',
        city: 'Vancouver',
        province: 'BC' as const,
      },
    }

    beforeEach(() => {
      jest.mocked(BcscCore.createDeviceSignedJWT).mockResolvedValue('signed-jwt-token')
    })

    it('posts with an id_token_hint JWT and the standard form-encoded headers', async () => {
      const apiClient = buildMockApiClient()
      const api = renderAuthApi(apiClient)

      await act(async () => {
        await api.authorizeDeviceWithUnknownBCSC(baseConfig)
      })

      expect(apiClient.post).toHaveBeenCalledWith(
        DEVICE_AUTH_ENDPOINT,
        expect.objectContaining({
          client_id: FAKE_CLIENT_ID,
          response_type: 'device_code',
          scope: IAS_SCOPE,
          id_token_hint: 'signed-jwt-token',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipBearerAuth: true,
        }
      )
    })

    it('passes user/address claims through to createDeviceSignedJWT', async () => {
      const apiClient = buildMockApiClient()
      const api = renderAuthApi(apiClient)

      await act(async () => {
        await api.authorizeDeviceWithUnknownBCSC({ ...baseConfig, gender: 'female', middleNames: 'May' })
      })

      expect(BcscCore.createDeviceSignedJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          family_name: 'Dinkley',
          given_name: 'Velma',
          birthdate: '1995-12-17',
          address: {
            street_address: '123 Main St',
            postal_code: 'V6B 1A1',
            locality: 'Vancouver',
            region: 'BC',
            country: 'CA',
          },
          gender: 'female',
          middle_name: 'May',
        })
      )
    })

    it("defaults gender to 'unknown' when not provided", async () => {
      const apiClient = buildMockApiClient()
      const api = renderAuthApi(apiClient)

      await act(async () => {
        await api.authorizeDeviceWithUnknownBCSC(baseConfig)
      })

      expect(BcscCore.createDeviceSignedJWT).toHaveBeenCalledWith(expect.objectContaining({ gender: 'unknown' }))
    })

    it('omits middle_name when not provided or empty', async () => {
      const apiClient = buildMockApiClient()
      const api = renderAuthApi(apiClient)

      await act(async () => {
        await api.authorizeDeviceWithUnknownBCSC(baseConfig)
      })
      expect(BcscCore.createDeviceSignedJWT).toHaveBeenLastCalledWith(
        expect.objectContaining({ middle_name: undefined })
      )

      await act(async () => {
        await api.authorizeDeviceWithUnknownBCSC({ ...baseConfig, middleNames: '' })
      })
      expect(BcscCore.createDeviceSignedJWT).toHaveBeenLastCalledWith(
        expect.objectContaining({ middle_name: undefined })
      )
    })
  })
})

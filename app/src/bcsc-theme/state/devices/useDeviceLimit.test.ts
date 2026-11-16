import * as IdTokenContext from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { IdToken } from '@/bcsc-theme/utils/id-token'
import { renderHook } from '@testing-library/react-native'
import { DeviceLimit } from './device-limit'
import { useDeviceLimit } from './useDeviceLimit'

const mockIdToken = (idToken: Partial<IdToken> | null) =>
  jest.spyOn(IdTokenContext, 'useIdToken').mockReturnValue({
    idToken: idToken as IdToken | null,
    isLoading: false,
    refreshIdToken: jest.fn(),
  })

describe('useDeviceLimit', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns Unknown while the id token is not loaded', () => {
    mockIdToken(null)

    const { result } = renderHook(() => useDeviceLimit())

    expect(result.current).toEqual({ limit: DeviceLimit.Unknown })
  })

  it('returns Under when the device count is below the limit', () => {
    mockIdToken({ bcsc_devices_count: 2, bcsc_max_devices: 3 })

    const { result } = renderHook(() => useDeviceLimit())

    expect(result.current).toEqual({ limit: DeviceLimit.Under, deviceCount: 2, deviceLimit: 3 })
  })

  it('returns Over when the device count reaches the limit', () => {
    mockIdToken({ bcsc_devices_count: 3, bcsc_max_devices: 3 })

    const { result } = renderHook(() => useDeviceLimit())

    expect(result.current).toEqual({ limit: DeviceLimit.Over, deviceCount: 3, deviceLimit: 3 })
  })

  it('updates when the id token changes', () => {
    const spy = mockIdToken({ bcsc_devices_count: 2, bcsc_max_devices: 3 })
    const { result, rerender } = renderHook(() => useDeviceLimit())

    expect(result.current.limit).toBe(DeviceLimit.Under)

    spy.mockReturnValue({
      idToken: { bcsc_devices_count: 4, bcsc_max_devices: 3 } as IdToken,
      isLoading: false,
      refreshIdToken: jest.fn(),
    })
    rerender({})

    expect(result.current.limit).toBe(DeviceLimit.Over)
  })

  it('returns the same result between renders while the id token is unchanged', () => {
    mockIdToken({ bcsc_devices_count: 2, bcsc_max_devices: 3 })
    const { result, rerender } = renderHook(() => useDeviceLimit())
    const first = result.current

    rerender({})

    expect(result.current).toBe(first)
  })
})

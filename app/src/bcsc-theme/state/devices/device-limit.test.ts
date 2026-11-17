import { DeviceLimit, getDeviceLimit } from './device-limit'

describe('getDeviceLimit', () => {
  it('returns Unknown when the device count is missing', () => {
    expect(getDeviceLimit({ deviceCount: null, deviceLimit: 3 })).toEqual({ limit: DeviceLimit.Unknown })
  })

  it('returns Unknown when the device limit is missing', () => {
    expect(getDeviceLimit({ deviceCount: 2, deviceLimit: null })).toEqual({ limit: DeviceLimit.Unknown })
  })

  it('returns Unknown when both are missing', () => {
    expect(getDeviceLimit({ deviceCount: null, deviceLimit: null })).toEqual({ limit: DeviceLimit.Unknown })
  })

  it('returns Under when the count is below the limit', () => {
    expect(getDeviceLimit({ deviceCount: 2, deviceLimit: 3 })).toEqual({
      limit: DeviceLimit.Under,
      deviceCount: 2,
      deviceLimit: 3,
    })
  })

  it('returns Under with no devices registered', () => {
    expect(getDeviceLimit({ deviceCount: 0, deviceLimit: 3 })).toEqual({
      limit: DeviceLimit.Under,
      deviceCount: 0,
      deviceLimit: 3,
    })
  })

  it('returns Over when the count reaches the limit', () => {
    expect(getDeviceLimit({ deviceCount: 3, deviceLimit: 3 })).toEqual({
      limit: DeviceLimit.AtOrOver,
      deviceCount: 3,
      deviceLimit: 3,
    })
  })

  it('returns Over when the count is above the limit', () => {
    expect(getDeviceLimit({ deviceCount: 5, deviceLimit: 3 })).toEqual({
      limit: DeviceLimit.AtOrOver,
      deviceCount: 5,
      deviceLimit: 3,
    })
  })

  it('treats a count of zero and a limit of zero as Over, since the limit is reached', () => {
    expect(getDeviceLimit({ deviceCount: 0, deviceLimit: 0 })).toEqual({
      limit: DeviceLimit.AtOrOver,
      deviceCount: 0,
      deviceLimit: 0,
    })
  })
})

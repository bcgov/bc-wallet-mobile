import { IdToken } from '@/bcsc-theme/utils/id-token'
import { DeviceLimit } from './device-limit'
import { selectDeviceLimit } from './selectors'

const buildIdToken = (overrides: Partial<IdToken> = {}) =>
  ({ bcsc_devices_count: 2, bcsc_max_devices: 3, ...overrides }) as IdToken

describe('selectDeviceLimit', () => {
  it('returns Unknown when there is no id token', () => {
    expect(selectDeviceLimit(null)).toEqual({ limit: DeviceLimit.Unknown })
  })

  it('returns Unknown when the id token has no device count', () => {
    const idToken = buildIdToken({ bcsc_devices_count: undefined as unknown as number })

    expect(selectDeviceLimit(idToken)).toEqual({ limit: DeviceLimit.Unknown })
  })

  it('returns Unknown when the id token has no device limit', () => {
    const idToken = buildIdToken({ bcsc_max_devices: undefined as unknown as number })

    expect(selectDeviceLimit(idToken)).toEqual({ limit: DeviceLimit.Unknown })
  })

  it('reads the device count and limit from the id token', () => {
    expect(selectDeviceLimit(buildIdToken())).toEqual({
      limit: DeviceLimit.Under,
      deviceCount: 2,
      deviceLimit: 3,
    })
  })

  it('returns Over when the id token is at the limit', () => {
    expect(selectDeviceLimit(buildIdToken({ bcsc_devices_count: 3 }))).toEqual({
      limit: DeviceLimit.AtOrOver,
      deviceCount: 3,
      deviceLimit: 3,
    })
  })
})

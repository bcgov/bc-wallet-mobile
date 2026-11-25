import { IdToken } from '@/bcsc-theme/utils/id-token'
import { DeviceLimitResult, getDeviceLimit } from './device-limit'

/**
 * Reads the device count and limit from the ID token and returns a DeviceLimit object.
 *
 * @param idToken - The ID token containing the device count and limit.
 * @returns An object containing the device count and limit.
 */
export const selectDeviceLimit = (idToken: IdToken | null): DeviceLimitResult => {
  return getDeviceLimit({
    deviceCount: idToken?.bcsc_devices_count ?? null,
    deviceLimit: idToken?.bcsc_max_devices ?? null,
  })
}

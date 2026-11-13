export enum DeviceLimit {
  Over = 'over',
  Under = 'under',
  Unknown = 'unknown',
}

export type DeviceLimitResult =
  | {
      limit: DeviceLimit.Over
      deviceLimit: number
      deviceCount: number
    }
  | {
      limit: DeviceLimit.Under
      deviceLimit: number
      deviceCount: number
    }
  | {
      limit: DeviceLimit.Unknown
    }

interface DeviceLimitFacts {
  deviceCount: number | null
  deviceLimit: number | null
}

/**
 * Determines the device limit status based on the current device count and the allowed device limit.
 *
 * @param facts - The current device count and the allowed device limit.
 * @returns - The device limit status, including whether the device count is over, at, or under the limit, along with the device count and limit.
 */
export const getDeviceLimit = (facts: DeviceLimitFacts): DeviceLimitResult => {
  if (facts.deviceLimit === null || facts.deviceCount === null) {
    return {
      limit: DeviceLimit.Unknown,
    }
  }

  if (facts.deviceCount > facts.deviceLimit) {
    return {
      limit: DeviceLimit.Over,
      deviceLimit: facts.deviceLimit,
      deviceCount: facts.deviceCount,
    }
  }

  return {
    limit: DeviceLimit.Under,
    deviceLimit: facts.deviceLimit,
    deviceCount: facts.deviceCount,
  }
}

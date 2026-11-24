export enum DeviceLimit {
  AtOrOver = 'over',
  Under = 'under',
  Unknown = 'unknown',
}

export type DeviceLimitResult =
  | {
      limit: DeviceLimit.AtOrOver
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
 */
export const getDeviceLimit = (facts: DeviceLimitFacts): DeviceLimitResult => {
  if (facts.deviceLimit === null || facts.deviceCount === null) {
    return {
      limit: DeviceLimit.Unknown,
    }
  }

  if (facts.deviceCount >= facts.deviceLimit) {
    return {
      limit: DeviceLimit.AtOrOver,
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

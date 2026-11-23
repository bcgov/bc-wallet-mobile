// iOS errSecInteractionNotAllowed: the item exists but the device is locked.
// react-native-keychain 10 rejects with it as the error code. Android has no equivalent.
const IOS_INTERACTION_NOT_ALLOWED = -25308

export const isDeviceLockedError = (error: unknown): boolean =>
  (error as { code?: unknown } | null)?.code === String(IOS_INTERACTION_NOT_ALLOWED)

import { Linking } from 'react-native'

export const openLink = async (url: string) => {
  // Only `https://` is allowed. Update manifest as needed.
  const supported = await Linking.canOpenURL(url)

  if (supported) {
    // Will open in device browser.
    await Linking.openURL(url)
  }
}

export const expirationOverrideInMinutes = (
  enabledAt: Date,
  autoDisableRemoteLoggingIntervalInMinutes: number
): number => {
  const now = Date.now()
  const enabledAtTime = enabledAt.getTime()
  const autoDisableIntervalInMilliseconds = autoDisableRemoteLoggingIntervalInMinutes * 60000

  if (enabledAtTime < now - autoDisableIntervalInMilliseconds) {
    return 0
  }

  const diffInMinutes = Math.floor((now - enabledAtTime) / 60000)
  return autoDisableRemoteLoggingIntervalInMinutes - diffInMinutes
}

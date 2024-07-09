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
  const now = new Date()
  const autoDisableRemoteLoggingMinutesAgo = new Date(now.getTime() - autoDisableRemoteLoggingIntervalInMinutes * 60000)
  const isOlderThanAutoDisableInterval = enabledAt < autoDisableRemoteLoggingMinutesAgo

  if (isOlderThanAutoDisableInterval) {
    return 0
  }

  const diffInMilliseconds = now.getTime() - enabledAt.getTime()
  const diffInMinutes = Math.floor(diffInMilliseconds / 1000 / 60)
  const expirationOverrideInMinutes = autoDisableRemoteLoggingIntervalInMinutes - diffInMinutes

  return expirationOverrideInMinutes
}

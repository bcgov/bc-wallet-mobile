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

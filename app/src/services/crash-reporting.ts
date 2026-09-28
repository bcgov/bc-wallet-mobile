import {
  deleteUnsentReports,
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics'

/**
 * Installs the Crashlytics JS crash handler. Call once, before the app component registers.
 */
export const initCrashReporting = (): void => {
  const defaultHandler = ErrorUtils.getGlobalHandler()
  // RNFB installs its handler when the module is first created
  getCrashlytics()
  const crashlyticsHandler = ErrorUtils.getGlobalHandler()

  // RNFB ends the app on every error it handles, so only fatal ones go to it
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      crashlyticsHandler(error, isFatal)
      return
    }

    defaultHandler(error, isFatal)
  })
}

/**
 * Turns crash collection on or off. Crashlytics applies it from the next launch.
 * Turning it off also deletes reports cached on the device, so they are never sent later.
 *
 * @param enabled - Whether this app may send crash reports
 */
export const setCrashReportingEnabled = async (enabled: boolean): Promise<void> => {
  const crashlytics = getCrashlytics()
  await setCrashlyticsCollectionEnabled(crashlytics, enabled)

  if (!enabled) {
    await deleteUnsentReports(crashlytics)
  }
}

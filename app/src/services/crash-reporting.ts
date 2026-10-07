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
  const crashlytics = getCrashlytics()
  const crashlyticsHandler = ErrorUtils.getGlobalHandler()

  // RNFB ends the app on every error it handles, so only fatal ones go to it.
  // Once collection is turned off mid-launch it would neither record nor end the app, so skip it then.
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal && crashlytics.isCrashlyticsCollectionEnabled) {
      crashlyticsHandler(error, isFatal)
      return
    }

    defaultHandler(error, isFatal)
  })
}

/**
 * Turns crash collection on or off. Crashlytics only picks it up at launch: on applies from the next
 * launch, off from the one after, and until then reports on the device can still upload.
 * Off also deletes unsent reports, which Crashlytics honours only in a launch that started with it off.
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

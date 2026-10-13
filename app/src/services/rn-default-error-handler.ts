/**
 * React Native's own global error handler, captured before Crashlytics installs its handler on import.
 * index.js imports it before anything that can load Crashlytics, so keep it free of imports.
 */
export const rnDefaultHandler = ErrorUtils.getGlobalHandler()

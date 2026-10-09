type GlobalHandler = Parameters<typeof ErrorUtils.setGlobalHandler>[0]
type CrashReporting = typeof import('@/services/crash-reporting')
type Crashlytics = typeof import('@react-native-firebase/crashlytics')

describe('crash-reporting', () => {
  const rnHandler = jest.fn()
  let globalHandler: GlobalHandler
  let crashlytics: Crashlytics
  let crashReporting: CrashReporting

  beforeEach(() => {
    globalHandler = rnHandler
    Object.defineProperty(globalThis, 'ErrorUtils', {
      configurable: true,
      value: {
        getGlobalHandler: () => globalHandler,
        setGlobalHandler: (handler: GlobalHandler) => {
          globalHandler = handler
        },
      },
    })

    // Loads in index.js order: React Native's handler is captured first, then RNFB installs its own on import
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      require('@/services/rn-default-error-handler')
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      crashlytics = require('@react-native-firebase/crashlytics')
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      crashReporting = require('@/services/crash-reporting')
    })
  })

  describe('initCrashReporting', () => {
    let crashlyticsHandler: GlobalHandler
    let instance: { isCrashlyticsCollectionEnabled: boolean }

    beforeEach(() => {
      crashlyticsHandler = globalHandler
      instance = { isCrashlyticsCollectionEnabled: true }
      jest.mocked(crashlytics.getCrashlytics).mockReturnValue(instance as ReturnType<Crashlytics['getCrashlytics']>)
    })

    it('sends fatal errors to Crashlytics', () => {
      const error = new Error('fatal')

      crashReporting.initCrashReporting()
      globalHandler(error, true)

      expect(crashlyticsHandler).toHaveBeenCalledWith(error, true)
      expect(rnHandler).not.toHaveBeenCalled()
    })

    it("leaves non-fatal errors to React Native's handler", () => {
      const error = new Error('non-fatal')

      crashReporting.initCrashReporting()
      globalHandler(error, false)

      expect(rnHandler).toHaveBeenCalledWith(error, false)
      expect(crashlyticsHandler).not.toHaveBeenCalled()
    })

    it("leaves fatal errors to React Native's handler once collection is turned off", () => {
      const error = new Error('fatal')

      crashReporting.initCrashReporting()
      instance.isCrashlyticsCollectionEnabled = false
      globalHandler(error, true)

      expect(rnHandler).toHaveBeenCalledWith(error, true)
      expect(crashlyticsHandler).not.toHaveBeenCalled()
    })
  })

  describe('setCrashReportingEnabled', () => {
    it('enables collection and keeps cached reports', async () => {
      await crashReporting.setCrashReportingEnabled(true)

      expect(crashlytics.setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), true)
      expect(crashlytics.deleteUnsentReports).not.toHaveBeenCalled()
    })

    it('disables collection and deletes cached reports', async () => {
      await crashReporting.setCrashReportingEnabled(false)

      expect(crashlytics.setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), false)
      expect(crashlytics.deleteUnsentReports).toHaveBeenCalled()
    })
  })
})

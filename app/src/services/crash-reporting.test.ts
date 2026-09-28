import { initCrashReporting, setCrashReportingEnabled } from '@/services/crash-reporting'
import {
  deleteUnsentReports,
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics'

type GlobalHandler = Parameters<typeof ErrorUtils.setGlobalHandler>[0]

describe('crash-reporting', () => {
  describe('initCrashReporting', () => {
    const defaultHandler = jest.fn()
    const crashlyticsHandler = jest.fn()
    let globalHandler: GlobalHandler

    beforeEach(() => {
      globalHandler = defaultHandler
      Object.defineProperty(globalThis, 'ErrorUtils', {
        configurable: true,
        value: {
          getGlobalHandler: () => globalHandler,
          setGlobalHandler: (handler: GlobalHandler) => {
            globalHandler = handler
          },
        },
      })
      // Creating the RNFB module installs its handler
      jest.mocked(getCrashlytics).mockImplementationOnce(() => {
        globalHandler = crashlyticsHandler
        return {} as ReturnType<typeof getCrashlytics>
      })
    })

    it('sends fatal errors to Crashlytics', () => {
      const error = new Error('fatal')

      initCrashReporting()
      globalHandler(error, true)

      expect(crashlyticsHandler).toHaveBeenCalledWith(error, true)
      expect(defaultHandler).not.toHaveBeenCalled()
    })

    it('leaves non-fatal errors to the default handler', () => {
      const error = new Error('non-fatal')

      initCrashReporting()
      globalHandler(error, false)

      expect(defaultHandler).toHaveBeenCalledWith(error, false)
      expect(crashlyticsHandler).not.toHaveBeenCalled()
    })
  })

  describe('setCrashReportingEnabled', () => {
    it('enables collection and keeps cached reports', async () => {
      await setCrashReportingEnabled(true)

      expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), true)
      expect(deleteUnsentReports).not.toHaveBeenCalled()
    })

    it('disables collection and deletes cached reports', async () => {
      await setCrashReportingEnabled(false)

      expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), false)
      expect(deleteUnsentReports).toHaveBeenCalled()
    })
  })
})

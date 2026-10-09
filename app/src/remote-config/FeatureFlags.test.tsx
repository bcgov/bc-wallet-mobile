import { useFeatureFlags } from '@/remote-config/FeatureFlags'
import { getInitialEnvironment, IASEnvironment } from '@/utils/environment'
import { renderHook } from '@testing-library/react-native'

let mockFeatureFlags = { 'debug.testFeature': false, 'kill.crashlytics': false }
let mockEnvironment = IASEnvironment.SIT

jest.mock('@/remote-config/RemoteConfig', () => ({
  useRemoteConfig: () => ({ getValue: () => mockFeatureFlags }),
}))

jest.mock('@bifold/core', () => ({
  useStore: () => [{ developer: { environment: mockEnvironment } }],
}))

jest.mock('@/utils/environment', () => ({
  ...jest.requireActual('@/utils/environment'),
  getInitialEnvironment: jest.fn(),
}))

describe('useFeatureFlags', () => {
  describe('crashReportingEnabled', () => {
    beforeEach(() => {
      mockFeatureFlags = { 'debug.testFeature': false, 'kill.crashlytics': false }
      mockEnvironment = IASEnvironment.SIT
    })

    it('is on for non-prod builds', () => {
      jest.mocked(getInitialEnvironment).mockReturnValue(IASEnvironment.SIT)

      const { result } = renderHook(() => useFeatureFlags())

      expect(result.current.featureGates.crashReportingEnabled()).toBe(true)
    })

    it('stays off for prod builds', () => {
      jest.mocked(getInitialEnvironment).mockReturnValue(IASEnvironment.PROD)
      mockEnvironment = IASEnvironment.PROD

      const { result } = renderHook(() => useFeatureFlags())

      expect(result.current.featureGates.crashReportingEnabled()).toBe(false)
    })

    it('stays off for prod builds switched to another environment', () => {
      jest.mocked(getInitialEnvironment).mockReturnValue(IASEnvironment.PROD)

      const { result } = renderHook(() => useFeatureFlags())

      expect(result.current.featureGates.crashReportingEnabled()).toBe(false)
    })

    it('is off when a non-prod build is switched to prod', () => {
      jest.mocked(getInitialEnvironment).mockReturnValue(IASEnvironment.SIT)
      // A stored copy, under the name older builds used
      mockEnvironment = { ...IASEnvironment.PROD, name: 'Prod (id)' }

      const { result } = renderHook(() => useFeatureFlags())

      expect(result.current.featureGates.crashReportingEnabled()).toBe(false)
    })

    it('is off when killed remotely', () => {
      jest.mocked(getInitialEnvironment).mockReturnValue(IASEnvironment.SIT)
      mockFeatureFlags = { 'debug.testFeature': false, 'kill.crashlytics': true }

      const { result } = renderHook(() => useFeatureFlags())

      expect(result.current.featureGates.crashReportingEnabled()).toBe(false)
    })
  })
})

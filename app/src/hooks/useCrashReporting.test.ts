import { useCrashReporting } from '@/hooks/useCrashReporting'
import { setCrashReportingEnabled } from '@/services/crash-reporting'
import { renderHook, waitFor } from '@testing-library/react-native'

const mockLogger = { error: jest.fn() }
let mockLoading = false
let mockEnabled = true

jest.mock('@bifold/core', () => ({
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: () => [mockLogger],
}))

jest.mock('@/remote-config/RemoteConfig', () => ({
  useRemoteConfig: () => ({ loading: mockLoading }),
}))

jest.mock('@/remote-config/FeatureFlags', () => ({
  useFeatureFlags: () => ({ featureGates: { crashReportingEnabled: () => mockEnabled } }),
}))

jest.mock('@/services/crash-reporting', () => ({
  setCrashReportingEnabled: jest.fn(() => Promise.resolve()),
}))

describe('useCrashReporting', () => {
  beforeEach(() => {
    mockLoading = false
    mockEnabled = true
  })

  it('waits for remote config before applying the gate', () => {
    mockLoading = true

    renderHook(() => useCrashReporting())

    expect(setCrashReportingEnabled).not.toHaveBeenCalled()
  })

  it.each([true, false])('applies the gate (%s) once remote config has loaded', (enabled) => {
    mockEnabled = enabled

    renderHook(() => useCrashReporting())

    expect(setCrashReportingEnabled).toHaveBeenCalledWith(enabled)
  })

  it('logs when the setting cannot be applied', async () => {
    const error = new Error('native failure')
    jest.mocked(setCrashReportingEnabled).mockRejectedValueOnce(error)

    renderHook(() => useCrashReporting())

    await waitFor(() =>
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('crash reporting'), error)
    )
  })
})

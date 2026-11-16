import * as ServerStatusContext from '@/bcsc-theme/contexts/ServerStatusContext'
import { renderHook } from '@testing-library/react-native'
import { AppUpdate } from './app-update'
import { useAppUpdate } from './useAppUpdate'

// The device-info mock reports app version 4.0.0 and build 142
const mockServerStatus = (serverStatus: unknown) =>
  jest.spyOn(ServerStatusContext, 'useServerStatus').mockReturnValue({
    isAvailable: true,
    serverStatus: serverStatus as any,
    isChecking: false,
    hasChecked: true,
    refresh: jest.fn(),
  })

describe('useAppUpdate', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns Optional when a supported version is newer than the app', () => {
    mockServerStatus({ minVersion: '100', supportedVersions: ['4.0.0', '4.1.0'] })

    const { result } = renderHook(() => useAppUpdate())

    expect(result.current).toBe(AppUpdate.Optional)
  })

  it('returns None when no supported version is newer than the app', () => {
    mockServerStatus({ minVersion: '100', supportedVersions: ['4.0.0'] })

    const { result } = renderHook(() => useAppUpdate())

    expect(result.current).toBe(AppUpdate.None)
  })

  it('returns Mandatory when the app build is below the minimum build', () => {
    mockServerStatus({ minVersion: '200', supportedVersions: ['4.0.0', '4.1.0'] })

    const { result } = renderHook(() => useAppUpdate())

    expect(result.current).toBe(AppUpdate.Mandatory)
  })

  it('returns Unknown when the server status is unavailable', () => {
    mockServerStatus(null)

    const { result } = renderHook(() => useAppUpdate())

    expect(result.current).toBe(AppUpdate.Unknown)
  })

  it('updates when the server status changes', () => {
    const spy = mockServerStatus({ minVersion: '100', supportedVersions: ['4.0.0'] })

    const { result, rerender } = renderHook(() => useAppUpdate())

    expect(result.current).toBe(AppUpdate.None)

    spy.mockReturnValue({
      isAvailable: true,
      serverStatus: { minVersion: '100', supportedVersions: ['4.0.0', '4.1.0'] } as any,
      isChecking: false,
      hasChecked: true,
      refresh: jest.fn(),
    })
    rerender({})

    expect(result.current).toBe(AppUpdate.Optional)
  })
})

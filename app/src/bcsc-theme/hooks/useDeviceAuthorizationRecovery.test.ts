import {
  useDeviceAuthorizationRecovery,
  useIsDeviceAuthorizationRecovering,
} from '@/bcsc-theme/hooks/useDeviceAuthorizationRecovery'
import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { navigationRef } from '@/contexts/NavigationContainerContext'
import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'

jest.mock('@/bcsc-theme/services/hooks/useRegistrationService')
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: jest.fn(), getCurrentRoute: jest.fn() },
}))
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return { ...actual, useServices: jest.fn() }
})

const mockCycleRegistration = jest.fn()
const mockLogger = { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }

// Renders both hooks together so tests can observe the module-level isRecovering flag
// (see useDeviceAuthorizationRecovery.ts) alongside the recovery attempt that drives it.
const useHarness = () => ({
  attemptWithRecovery: useDeviceAuthorizationRecovery(),
  isRecovering: useIsDeviceAuthorizationRecovering(),
})

const alreadyRegisteredError = () => {
  const error = new AppError(
    'client is in invalid state',
    { category: ErrorCategory.NETWORK, appEvent: AppEventCode.ERR_501_INVALID_REGISTRATION_REQUEST, statusCode: 2810 },
    { track: false }
  )
  error.handled = true
  return error
}

describe('useDeviceAuthorizationRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useRegistrationService).mockReturnValue({ cycleRegistration: mockCycleRegistration } as any)
    jest.mocked(Bifold.useServices).mockReturnValue([mockLogger] as any)
    jest.mocked(navigationRef.isReady).mockReturnValue(true)
  })

  it('returns the thunk result on success without touching anything', async () => {
    const thunk = jest.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => useDeviceAuthorizationRecovery())

    const value = await result.current(thunk, 'ResidentialAddress')

    expect(value).toBe('ok')
    expect(mockCycleRegistration).not.toHaveBeenCalled()
  })

  it('rethrows unrelated errors unchanged, without cycling the registration', async () => {
    const otherError = new AppError(
      'server is down',
      { category: ErrorCategory.NETWORK, appEvent: AppEventCode.SERVER_ERROR, statusCode: 2103 },
      { track: false }
    )
    const thunk = jest.fn().mockRejectedValue(otherError)
    const { result } = renderHook(() => useDeviceAuthorizationRecovery())

    await expect(result.current(thunk, 'ResidentialAddress')).rejects.toBe(otherError)
    expect(mockCycleRegistration).not.toHaveBeenCalled()
    expect(thunk).toHaveBeenCalledTimes(1)
  })

  it('rethrows unchanged when the global policy already moved the user off the origin screen (free self-heal)', async () => {
    jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: 'EnterEmail', key: 'k' } as any)
    const error = alreadyRegisteredError()
    const thunk = jest.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useDeviceAuthorizationRecovery())

    await expect(result.current(thunk, 'ResidentialAddress')).rejects.toBe(error)
    expect(mockCycleRegistration).not.toHaveBeenCalled()
    expect(thunk).toHaveBeenCalledTimes(1)
  })

  it('cycles the registration and retries once when the reset was a no-op (still on the origin screen)', async () => {
    jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: 'ResidentialAddress', key: 'k' } as any)
    const { result } = renderHook(() => useHarness())

    let resolveCycle: () => void = () => {}
    mockCycleRegistration.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveCycle = resolve
        })
    )
    const thunk = jest.fn().mockRejectedValueOnce(alreadyRegisteredError()).mockResolvedValueOnce('recovered')

    expect(result.current.isRecovering).toBe(false)

    let attemptPromise!: Promise<unknown>
    await act(async () => {
      attemptPromise = result.current.attemptWithRecovery(thunk, 'ResidentialAddress')
      // Flush microtasks so the isRecovering(true) update (set just before cycleRegistration is
      // awaited) commits before we assert on it below.
      await Promise.resolve()
    })

    // The global policy's reset remounts the origin screen (fresh route key, same name), wiping any
    // local loading state — isRecovering is module state so a freshly mounted screen still sees it.
    expect(result.current.isRecovering).toBe(true)

    await act(async () => {
      resolveCycle()
      await attemptPromise
    })

    expect(await attemptPromise).toBe('recovered')
    expect(mockCycleRegistration).toHaveBeenCalledTimes(1)
    expect(thunk).toHaveBeenCalledTimes(2)
    expect(result.current.isRecovering).toBe(false)
  })

  it('treats an unready navigator as a no-op (still attempts recovery)', async () => {
    jest.mocked(navigationRef.isReady).mockReturnValue(false)
    mockCycleRegistration.mockResolvedValue(undefined)
    const thunk = jest.fn().mockRejectedValueOnce(alreadyRegisteredError()).mockResolvedValueOnce('recovered')
    const { result } = renderHook(() => useDeviceAuthorizationRecovery())

    const value = await result.current(thunk, 'ResidentialAddress')

    expect(value).toBe('recovered')
    expect(mockCycleRegistration).toHaveBeenCalledTimes(1)
  })

  it('propagates the retry failure without a second retry when cycling does not fix it', async () => {
    jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: 'ResidentialAddress', key: 'k' } as any)
    mockCycleRegistration.mockResolvedValue(undefined)
    const secondError = alreadyRegisteredError()
    const thunk = jest.fn().mockRejectedValueOnce(alreadyRegisteredError()).mockRejectedValueOnce(secondError)
    const { result } = renderHook(() => useDeviceAuthorizationRecovery())

    await expect(result.current(thunk, 'ResidentialAddress')).rejects.toBe(secondError)
    expect(mockCycleRegistration).toHaveBeenCalledTimes(1)
    expect(thunk).toHaveBeenCalledTimes(2)
  })
})

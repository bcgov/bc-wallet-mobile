import { runSystemChecks } from '@/services/system-checks/system-checks'
import { act, renderHook } from '@testing-library/react-native'
import { AppState, AppStateStatus } from 'react-native'
import { useCreateSystemChecks } from './useCreateSystemChecks'
import { SystemCheckScope, useSystemChecks } from './useSystemChecks'

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

jest.mock('@bifold/core', () => ({
  useStore: () => [{ bcsc: {} }, jest.fn()],
  useServices: () => [mockLogger],
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
}))
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({}),
}))
jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))
jest.mock('@/services/system-checks/EventReasonAlertsSystemCheck', () => ({
  EventReasonAlertsSystemCheck: class EventReasonAlertsSystemCheck {},
}))
jest.mock('@/contexts/ErrorAlertContext', () => ({ useErrorAlert: () => ({ emitAlert: jest.fn() }) }))
jest.mock('./useBCSCApiClient', () => ({ useBCSCApiClientState: () => ({ client: null, isClientReady: false }) }))
jest.mock('../services/hooks/useTokenService', () => ({ useTokenService: () => ({}) }))
jest.mock('./useCreateSystemChecks', () => ({ useCreateSystemChecks: jest.fn() }))
jest.mock('@/services/system-checks/system-checks', () => ({ runSystemChecks: jest.fn().mockResolvedValue([]) }))

const foregroundCheck = { runCheck: jest.fn(), onFail: jest.fn() }
const mockGetForegroundSystemChecks = jest.fn()

// Scopes never ready, so only the listeners run
const scopeChecks = (getForegroundSystemChecks?: () => Promise<unknown[]>) => ({
  getSystemChecks: jest.fn().mockResolvedValue([]),
  getForegroundSystemChecks,
  isReady: false,
  isApplicable: true,
})

describe('useSystemChecks', () => {
  let appStateListeners: Array<(state: AppStateStatus) => void>
  let addEventListenerSpy: jest.SpyInstance

  const setAppState = async (state: AppStateStatus) => {
    await act(async () => {
      appStateListeners.forEach((listener) => listener(state))
    })
  }

  beforeEach(() => {
    appStateListeners = []
    addEventListenerSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      appStateListeners.push(listener as (state: AppStateStatus) => void)
      return { remove: jest.fn() } as any
    })
    mockGetForegroundSystemChecks.mockResolvedValue([foregroundCheck])
    jest.mocked(useCreateSystemChecks).mockReturnValue({
      [SystemCheckScope.STARTUP]: scopeChecks(mockGetForegroundSystemChecks),
      [SystemCheckScope.MAIN_STACK]: scopeChecks(),
      [SystemCheckScope.VERIFY]: scopeChecks(),
    } as any)
  })

  afterEach(() => {
    addEventListenerSpy.mockRestore()
  })

  it('runs the foreground checks each time the app becomes active', async () => {
    renderHook(() => useSystemChecks(SystemCheckScope.STARTUP))

    await setAppState('background')
    expect(mockGetForegroundSystemChecks).not.toHaveBeenCalled()

    await setAppState('active')
    await setAppState('background')
    await setAppState('active')

    expect(mockGetForegroundSystemChecks).toHaveBeenCalledTimes(2)
    expect(runSystemChecks).toHaveBeenCalledWith([foregroundCheck], mockLogger)
  })

  it('logs, rather than throws, when the foreground checks cannot be built', async () => {
    const error = new Error('status fetch blew up')
    mockGetForegroundSystemChecks.mockRejectedValue(error)
    renderHook(() => useSystemChecks(SystemCheckScope.STARTUP))

    await setAppState('active')

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('foreground system checks'), error)
  })

  it('does not listen for a scope without foreground checks', async () => {
    renderHook(() => useSystemChecks(SystemCheckScope.MAIN_STACK))

    await setAppState('active')

    expect(mockGetForegroundSystemChecks).not.toHaveBeenCalled()
  })
})

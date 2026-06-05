import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook } from '@testing-library/react-native'
import { AppState, AppStateStatus, Keyboard } from 'react-native'

import { BCSCActivityProvider, useBCSCActivity } from './BCSCActivityContext'

const mockLogout = jest.fn()

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({ logout: mockLogout }),
}))

const mockMediationRecipient = {
  stopMessagePickup: jest.fn().mockResolvedValue(undefined),
  initiateMessagePickup: jest.fn().mockResolvedValue(undefined),
}
const mockAgentHolder: { current: unknown } = { current: null }

jest.mock('@/bcsc-theme/features/agent/BCSCAgentProvider', () => ({
  useBCSCAgentSafe: () => ({ agent: mockAgentHolder.current }),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BasicAppContext>
    <BCSCActivityProvider>{children}</BCSCActivityProvider>
  </BasicAppContext>
)

describe('BCSCActivityContext', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockLogout.mockClear()
    mockMediationRecipient.stopMessagePickup.mockClear()
    mockMediationRecipient.initiateMessagePickup.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    mockAgentHolder.current = null
  })

  it('should expose reportActivity on the context', () => {
    const { result } = renderHook(() => useBCSCActivity(), { wrapper })

    expect(result.current.reportActivity).toBeDefined()
    expect(typeof result.current.reportActivity).toBe('function')
  })

  it('should reset inactivity timeout when reportActivity is called', () => {
    const { result } = renderHook(() => useBCSCActivity(), { wrapper })

    // Advance most of the way through the default 5-minute timeout
    act(() => {
      jest.advanceTimersByTime(4 * 60 * 1000)
    })

    // Report activity — should reset the timer
    act(() => {
      result.current.reportActivity()
    })

    // Advance another 4 minutes — would have exceeded 5 min total without reset
    act(() => {
      jest.advanceTimersByTime(4 * 60 * 1000)
    })

    expect(mockLogout).not.toHaveBeenCalled()

    // Advance past the full 5 min from last reset — should trigger logout
    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000)
    })

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('should not reset timeout when reportActivity is called while paused', () => {
    const { result } = renderHook(() => useBCSCActivity(), { wrapper })

    act(() => {
      result.current.pauseActivityTracking()
    })

    // reportActivity should be a no-op when paused
    act(() => {
      result.current.reportActivity()
    })

    // Advance well past the timeout — logout should not fire while paused
    act(() => {
      jest.advanceTimersByTime(10 * 60 * 1000)
    })

    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('should subscribe to keyboardDidShow and keyboardDidHide events', () => {
    const addListenerSpy = jest.spyOn(Keyboard, 'addListener')

    renderHook(() => useBCSCActivity(), { wrapper })

    const eventNames = addListenerSpy.mock.calls.map((call) => call[0])
    expect(eventNames).toContain('keyboardDidShow')
    expect(eventNames).toContain('keyboardDidHide')

    addListenerSpy.mockRestore()
  })

  it('should clean up keyboard listeners on unmount', () => {
    const removeMock = jest.fn()
    const addListenerSpy = jest.spyOn(Keyboard, 'addListener').mockReturnValue({
      remove: removeMock,
    } as unknown as ReturnType<typeof Keyboard.addListener>)

    const { unmount } = renderHook(() => useBCSCActivity(), { wrapper })

    unmount()

    // Two keyboard listeners should have been removed
    expect(removeMock).toHaveBeenCalledTimes(2)

    addListenerSpy.mockRestore()
  })

  it('stops message pickup on background and restarts live pickup on foreground', async () => {
    mockAgentHolder.current = { didcomm: { mediationRecipient: mockMediationRecipient } }
    let appStateHandler: ((state: AppStateStatus) => void | Promise<void>) | undefined
    const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'change') {
        appStateHandler = handler
      }
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>
    })

    renderHook(() => useBCSCActivity(), { wrapper })

    // Prime the previous app state to 'active' so the next transition is recognized,
    // then clear any pickup calls priming may have produced.
    await act(async () => {
      await appStateHandler?.('active')
    })
    mockMediationRecipient.stopMessagePickup.mockClear()
    mockMediationRecipient.initiateMessagePickup.mockClear()

    // → background: the live pickup socket is torn down.
    await act(async () => {
      await appStateHandler?.('background')
    })
    expect(mockMediationRecipient.stopMessagePickup).toHaveBeenCalledTimes(1)

    // → foreground: live pickup is restarted to flush anything queued while away.
    await act(async () => {
      await appStateHandler?.('active')
    })
    expect(mockMediationRecipient.initiateMessagePickup).toHaveBeenCalled()

    addEventListenerSpy.mockRestore()
  })

  it('does not touch message pickup (or log) when no agent is available', async () => {
    mockAgentHolder.current = null
    let appStateHandler: ((state: AppStateStatus) => void | Promise<void>) | undefined
    const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'change') {
        appStateHandler = handler
      }
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>
    })

    renderHook(() => useBCSCActivity(), { wrapper })

    await act(async () => {
      await appStateHandler?.('active')
    })
    await act(async () => {
      await appStateHandler?.('background')
    })
    await act(async () => {
      await appStateHandler?.('active')
    })

    expect(mockMediationRecipient.stopMessagePickup).not.toHaveBeenCalled()
    expect(mockMediationRecipient.initiateMessagePickup).not.toHaveBeenCalled()

    addEventListenerSpy.mockRestore()
  })
})

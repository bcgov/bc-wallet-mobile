import { BasicAppContext } from '@mocks/helpers/app'
import { act, renderHook } from '@testing-library/react-native'
import { Keyboard } from 'react-native'

import { BCSCActivityProvider, useBCSCActivity } from './BCSCActivityContext'

const mockLogout = jest.fn()

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => ({ logout: mockLogout }),
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
  })

  afterEach(() => {
    jest.useRealTimers()
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
})

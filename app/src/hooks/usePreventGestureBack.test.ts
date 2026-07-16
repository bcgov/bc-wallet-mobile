import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { renderHook } from '@testing-library/react-native'
import usePreventGestureBack from './usePreventGestureBack'

const mockAddListener = jest.fn()
const mockUseFocusEffect = jest.mocked(useFocusEffect)

describe('usePreventGestureBack', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const nav = useNavigation() as any
    nav.addListener = mockAddListener
  })

  it('registers a beforeRemove listener via useFocusEffect', () => {
    mockUseFocusEffect.mockImplementation((cb) => cb())
    mockAddListener.mockReturnValue(jest.fn())

    renderHook(() => usePreventGestureBack())

    expect(mockUseFocusEffect).toHaveBeenCalled()
    expect(mockAddListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function))
  })

  it('prevents navigation when action has no source (gesture)', () => {
    mockUseFocusEffect.mockImplementation((cb) => cb())
    mockAddListener.mockReturnValue(jest.fn())

    renderHook(() => usePreventGestureBack())

    const handler = mockAddListener.mock.calls[0][1]
    const event = { data: { action: {} }, preventDefault: jest.fn() }
    handler(event)

    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('allows navigation when action has a source (programmatic)', () => {
    mockUseFocusEffect.mockImplementation((cb) => cb())
    mockAddListener.mockReturnValue(jest.fn())

    renderHook(() => usePreventGestureBack())

    const handler = mockAddListener.mock.calls[0][1]
    const event = { data: { action: { source: 'some-screen' } }, preventDefault: jest.fn() }
    handler(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('invokes onPrevented after blocking a sourceless back', () => {
    // Lets a screen redirect somewhere of its own choosing rather than just holding the user in place.
    mockUseFocusEffect.mockImplementation((cb) => cb())
    mockAddListener.mockReturnValue(jest.fn())
    const onPrevented = jest.fn()

    renderHook(() => usePreventGestureBack(onPrevented))

    const handler = mockAddListener.mock.calls[0][1]
    const event = { data: { action: {} }, preventDefault: jest.fn() }
    handler(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(onPrevented).toHaveBeenCalledTimes(1)
  })

  it('does not invoke onPrevented for programmatic navigation', () => {
    mockUseFocusEffect.mockImplementation((cb) => cb())
    mockAddListener.mockReturnValue(jest.fn())
    const onPrevented = jest.fn()

    renderHook(() => usePreventGestureBack(onPrevented))

    const handler = mockAddListener.mock.calls[0][1]
    handler({ data: { action: { source: 'some-screen' } }, preventDefault: jest.fn() })

    expect(onPrevented).not.toHaveBeenCalled()
  })

  it('returns unsubscribe function from useFocusEffect cleanup', () => {
    const mockUnsubscribe = jest.fn()
    mockAddListener.mockReturnValue(mockUnsubscribe)

    let cleanup: (() => void) | undefined
    mockUseFocusEffect.mockImplementation((cb) => {
      cleanup = cb() as any
    })

    renderHook(() => usePreventGestureBack())

    expect(cleanup).toBe(mockUnsubscribe)
  })
})

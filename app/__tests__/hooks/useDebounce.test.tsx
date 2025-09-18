import { useDebounce } from '@/hooks/useDebounce'
import { act, renderHook } from '@testing-library/react-native'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current).toBe('hello')
  })

  it('should not update value before delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 500 },
    })

    rerender({ value: 'b', delay: 500 })
    // advance less than delay
    act(() => {
      jest.advanceTimersByTime(400)
    })

    expect(result.current).toBe('a') // still old value
  })

  it('should update value after delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 500 },
    })

    rerender({ value: 'b', delay: 500 })
    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('b') // updated after debounce delay
  })

  it('should reset timer if value changes before delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 500 },
    })

    rerender({ value: 'b', delay: 500 })

    act(() => {
      jest.advanceTimersByTime(300) // not enough yet
    })

    rerender({ value: 'c', delay: 500 })

    act(() => {
      jest.advanceTimersByTime(300) // still not enough for new value
    })

    expect(result.current).toBe('a') // still initial

    act(() => {
      jest.advanceTimersByTime(200) // complete the 500ms for 'c'
    })

    expect(result.current).toBe('c')
  })
})

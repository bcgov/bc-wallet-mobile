import { useEventListener } from '@/hooks/useEventListener'
import { renderHook } from '@testing-library/react-native'

describe('useEventListener', () => {
  it('should remove event listener on unmount', () => {
    const removeListener = jest.fn()

    const hook = renderHook(() => useEventListener(() => removeListener))

    hook.unmount()

    expect(removeListener).toHaveBeenCalledTimes(1)
  })

  it('should not add event listener when condition is false', () => {
    const addListener = jest.fn()

    renderHook(() => useEventListener(addListener, false))

    expect(addListener).not.toHaveBeenCalled()
  })

  it('should add and remove event listener when condition changes', () => {
    const removeListener = jest.fn()
    const addListener = jest.fn(() => removeListener)

    const hook = renderHook(({ condition }) => useEventListener(addListener, condition), {
      initialProps: { condition: false },
    })

    expect(removeListener).not.toHaveBeenCalled()
    expect(addListener).not.toHaveBeenCalled()

    hook.rerender({ condition: true })

    expect(addListener).toHaveBeenCalledTimes(1)
    expect(removeListener).not.toHaveBeenCalled()

    hook.rerender({ condition: false })

    expect(addListener).toHaveBeenCalledTimes(1)
    expect(removeListener).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple event listeners', () => {
    const removeListener1 = jest.fn()
    const removeListener2 = jest.fn()
    const addListener1 = jest.fn(() => removeListener1)
    const addListener2 = jest.fn(() => removeListener2)

    const hook1 = renderHook(() => useEventListener(addListener1, true))
    const hook2 = renderHook(() => useEventListener(addListener2, true))

    expect(addListener1).toHaveBeenCalledTimes(1)
    expect(addListener2).toHaveBeenCalledTimes(1)

    hook1.unmount()
    expect(removeListener1).toHaveBeenCalledTimes(1)
    expect(removeListener2).not.toHaveBeenCalled()

    hook2.unmount()
    expect(removeListener2).toHaveBeenCalledTimes(1)
  })

  it('should not re-render when listener function changes', () => {
    const removeListener = jest.fn()
    const addListener = jest.fn(() => removeListener)

    const hook = renderHook(({ listener }) => useEventListener(listener, true), {
      initialProps: { listener: addListener },
    })

    expect(addListener).toHaveBeenCalledTimes(1)

    const newAddListener = jest.fn(() => removeListener)
    hook.rerender({ listener: newAddListener })

    expect(addListener).toHaveBeenCalledTimes(1)
    expect(newAddListener).not.toHaveBeenCalled()

    hook.unmount()
    expect(removeListener).toHaveBeenCalledTimes(1)
  })
})

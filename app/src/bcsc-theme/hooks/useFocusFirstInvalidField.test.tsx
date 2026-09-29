import useFocusFirstInvalidField from '@/bcsc-theme/hooks/useFocusFirstInvalidField'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ScrollView, TextInput, View } from 'react-native'
import { KeyboardEvents } from 'react-native-keyboard-controller'

// Overrides the shared mock so KeyboardEvents.addListener can be spied on.
jest.mock('react-native-keyboard-controller', () => {
  const { ScrollView: RealScrollView } = jest.requireActual('react-native')
  return {
    KeyboardAwareScrollView: RealScrollView,
    KeyboardEvents: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  }
})

type Field = 'a' | 'b' | 'c'
const FIELD_ORDER: Field[] = ['a', 'b', 'c']

type HookApi = ReturnType<typeof useFocusFirstInvalidField<Field>>

const Harness = ({ apiRef }: { apiRef: React.MutableRefObject<HookApi | null> }) => {
  const api = useFocusFirstInvalidField(FIELD_ORDER)
  apiRef.current = api
  const { scrollViewRef, inputRefs, onContainerLayout, onFieldLayout } = api

  return (
    <ScrollView ref={scrollViewRef}>
      <View testID="container" onLayout={onContainerLayout}>
        <View testID="field-a" onLayout={onFieldLayout('a')}>
          <TextInput ref={inputRefs.a} testID="a" accessibilityLabel="a" />
        </View>
        <View testID="field-b" onLayout={onFieldLayout('b')}>
          <TextInput ref={inputRefs.b} testID="b" accessibilityLabel="b" />
        </View>
        <View testID="field-c" onLayout={onFieldLayout('c')} />
      </View>
    </ScrollView>
  )
}

const renderHarness = () => {
  const apiRef = { current: null } as React.MutableRefObject<HookApi | null>
  const tree = render(<Harness apiRef={apiRef} />)
  return { tree, apiRef }
}

const fireLayout = (tree: ReturnType<typeof render>, testId: string, y: number) =>
  fireEvent(tree.getByTestId(testId), 'layout', { nativeEvent: { layout: { y } } })

describe('useFocusFirstInvalidField', () => {
  let scrollToSpy: jest.SpyInstance
  let focusSpy: jest.SpyInstance
  let isFocusedSpy: jest.SpyInstance

  beforeEach(() => {
    scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn())
    focusSpy = jest.spyOn(TextInput.prototype, 'focus')
    isFocusedSpy = jest.spyOn(TextInput.prototype, 'isFocused').mockReturnValue(true)
  })

  afterEach(() => {
    scrollToSpy.mockRestore()
    focusSpy.mockRestore()
    isFocusedSpy.mockRestore()
  })

  it('scrolls to containerY + fieldY with animated:false, then focuses the first field in fieldOrder', () => {
    const { tree, apiRef } = renderHarness()
    fireLayout(tree, 'container', 100)
    fireLayout(tree, 'field-a', 10)
    fireLayout(tree, 'field-b', 40)

    act(() => {
      apiRef.current!.focusFirstInvalidField({ b: 'error', a: undefined })
    })

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 140, animated: false })
    expect(focusSpy).toHaveBeenCalledTimes(1)
    expect((focusSpy.mock.instances[0] as any).props.testID).toBe('b')
    expect(scrollToSpy.mock.invocationCallOrder[0]).toBeLessThan(focusSpy.mock.invocationCallOrder[0])
  })

  it('does nothing on empty errors', () => {
    const { apiRef } = renderHarness()

    act(() => {
      apiRef.current!.focusFirstInvalidField({})
    })

    expect(scrollToSpy).not.toHaveBeenCalled()
    expect(focusSpy).not.toHaveBeenCalled()
    expect(KeyboardEvents.addListener).not.toHaveBeenCalled()
  })

  it('re-fires scroll and focus on an identical second request', () => {
    const { tree, apiRef } = renderHarness()
    fireLayout(tree, 'container', 0)
    fireLayout(tree, 'field-a', 10)

    act(() => {
      apiRef.current!.focusFirstInvalidField({ a: 'error' })
    })
    const firstSubscription = jest.mocked(KeyboardEvents.addListener).mock.results[0].value

    act(() => {
      apiRef.current!.focusFirstInvalidField({ a: 'error' })
    })

    expect(scrollToSpy).toHaveBeenCalledTimes(2)
    expect(focusSpy).toHaveBeenCalledTimes(2)
    expect(KeyboardEvents.addListener).toHaveBeenCalledTimes(2)
    expect(firstSubscription.remove).toHaveBeenCalledTimes(1)
  })

  it('re-issues the scroll on keyboardDidShow when still focused', () => {
    const { tree, apiRef } = renderHarness()
    fireLayout(tree, 'container', 0)
    fireLayout(tree, 'field-a', 10)

    act(() => {
      apiRef.current!.focusFirstInvalidField({ a: 'error' })
    })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)

    const [, onKeyboardDidShow] = jest.mocked(KeyboardEvents.addListener).mock.calls[0]
    act(() => onKeyboardDidShow({} as never))

    expect(scrollToSpy).toHaveBeenCalledTimes(2)
    expect(scrollToSpy).toHaveBeenNthCalledWith(2, { y: 10, animated: false })
  })

  it('skips the re-jump and removes the listener when focus has moved away', () => {
    const { tree, apiRef } = renderHarness()
    fireLayout(tree, 'container', 0)
    fireLayout(tree, 'field-a', 10)

    act(() => {
      apiRef.current!.focusFirstInvalidField({ a: 'error' })
    })
    expect(scrollToSpy).toHaveBeenCalledTimes(1)

    const [, onKeyboardDidShow] = jest.mocked(KeyboardEvents.addListener).mock.calls[0]
    const { remove } = jest.mocked(KeyboardEvents.addListener).mock.results[0].value

    isFocusedSpy.mockReturnValue(false)
    act(() => onKeyboardDidShow({} as never))

    expect(scrollToSpy).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('removes the subscription on unmount', () => {
    const { tree, apiRef } = renderHarness()

    act(() => {
      apiRef.current!.focusFirstInvalidField({ a: 'error' })
    })
    const { remove } = jest.mocked(KeyboardEvents.addListener).mock.results[0].value
    expect(remove).not.toHaveBeenCalled()

    tree.unmount()

    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('focuses without scrolling when the field was never measured', () => {
    const { apiRef } = renderHarness()

    act(() => {
      apiRef.current!.focusFirstInvalidField({ a: 'error' })
    })

    expect(scrollToSpy).not.toHaveBeenCalled()
    expect(focusSpy).toHaveBeenCalledTimes(1)
  })

  it('scrolls only (no focus, no listener) for a field with no attached ref', () => {
    const { tree, apiRef } = renderHarness()
    fireLayout(tree, 'container', 0)
    fireLayout(tree, 'field-c', 60)

    act(() => {
      apiRef.current!.focusFirstInvalidField({ c: 'error' })
    })

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 60, animated: false })
    expect(focusSpy).not.toHaveBeenCalled()
    expect(KeyboardEvents.addListener).not.toHaveBeenCalled()
  })
})

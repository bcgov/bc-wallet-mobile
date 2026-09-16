import { createRef, RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { LayoutChangeEvent, ScrollView, TextInput } from 'react-native'
import { KeyboardEvents } from 'react-native-keyboard-controller'

type FocusRequest<F extends string> = { field: F }

/**
 * Scrolls to and focuses the first invalid field on a form after a failed submit.
 *
 * `fieldOrder` must be a module-scope constant: it's a `useCallback` dep, so a fresh array
 * every render would churn `focusFirstInvalidField`'s identity.
 */
const useFocusFirstInvalidField = <F extends string>(fieldOrder: readonly F[]) => {
  const scrollViewRef = useRef<ScrollView>(null)
  const containerY = useRef(0)
  const fieldYOffsets = useRef<Partial<Record<F, number>>>({})
  const [inputRefs] = useState(
    () =>
      Object.fromEntries(fieldOrder.map((f) => [f, createRef<TextInput>()])) as Record<F, RefObject<TextInput | null>>
  )
  const [request, setRequest] = useState<FocusRequest<F> | null>(null)

  useEffect(() => {
    if (!request) {
      return
    }
    const { field } = request
    const fieldY = fieldYOffsets.current[field]
    const jumpToField = () => {
      if (fieldY !== undefined) {
        scrollViewRef.current?.scrollTo({ y: containerY.current + fieldY, animated: false })
      }
    }
    // Jump before focus(), never animated: KeyboardAwareScrollView's own repositioning on the next
    // keyboard event beats an in-flight animation.
    jumpToField()

    // No TextInput behind this field (eg. a dropdown): scroll only, nothing to focus or listen for.
    if (!inputRefs[field].current) {
      return
    }
    inputRefs[field].current?.focus()

    // Re-jump once the keyboard opens: the pre-focus jump can clamp at max offset and leave the error text
    // under the keyboard. isFocused() stops a parked listener re-jumping after the user taps elsewhere.
    const subscription = KeyboardEvents.addListener('keyboardDidShow', () => {
      if (inputRefs[field].current?.isFocused()) {
        jumpToField()
      }
      subscription.remove()
    })

    return () => subscription.remove()
  }, [request, inputRefs])

  const focusFirstInvalidField = useCallback(
    (errors: Partial<Record<F, unknown>>) => {
      const field = fieldOrder.find((f) => errors[f] !== undefined)
      if (field) {
        // Always a fresh object: identity is what re-fires the focus effect on an identical resubmit.
        setRequest({ field })
      }
    },
    [fieldOrder]
  )

  return {
    scrollViewRef,
    inputRefs,
    onContainerLayout: (e: LayoutChangeEvent) => {
      containerY.current = e.nativeEvent.layout.y
    },
    onFieldLayout: (field: F) => (e: LayoutChangeEvent) => {
      fieldYOffsets.current[field] = e.nativeEvent.layout.y
    },
    focusFirstInvalidField,
  }
}

export default useFocusFirstInvalidField

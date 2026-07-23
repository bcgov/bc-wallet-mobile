import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Prevents gesture-based back navigation (Android hardware back, swipe) while
 * still allowing programmatic navigation (e.g. navigation.goBack()).
 *
 * gestureEnabled: false handles iOS; this hook handles Android's beforeRemove.
 *
 * @param onPrevented Called after a back is blocked. Lets a screen send the user somewhere of its own
 * choosing instead of simply holding them in place. Read through a ref, so passing an inline callback
 * does not re-subscribe the listener.
 */
const usePreventGestureBack = (onPrevented?: () => void) => {
  const navigation = useNavigation()
  const onPreventedRef = useRef(onPrevented)

  useEffect(() => {
    onPreventedRef.current = onPrevented
  }, [onPrevented])

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (event) => {
        if (!event.data.action.source) {
          event.preventDefault()
          onPreventedRef.current?.()
        }
      })
      return unsubscribe
    }, [navigation])
  )
}

export default usePreventGestureBack

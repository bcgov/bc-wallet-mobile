import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'

/**
 * Prevents gesture-based back navigation (Android hardware back, swipe) while
 * still allowing programmatic navigation (e.g. navigation.goBack()).
 *
 * gestureEnabled: false handles iOS; this hook handles Android's beforeRemove.
 */
const usePreventGestureBack = () => {
  const navigation = useNavigation()

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (event) => {
        if (!event.data.action.source) {
          event.preventDefault()
        }
      })
      return unsubscribe
    }, [navigation])
  )
}

export default usePreventGestureBack

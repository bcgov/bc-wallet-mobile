import NetInfo from '@react-native-community/netinfo'
import { useEffect, useRef } from 'react'

/**
 * Invokes `retry` when internet connectivity is restored (offline -> online
 * transition) and `shouldRetry` returns true.
 *
 * Used by data providers to reload state that failed to load while the device
 * was offline, so the app heals without requiring a restart.
 *
 * @param shouldRetry - Returns true when a retry is needed (e.g. data is missing and not currently loading).
 * @param retry - The reload action to invoke.
 */
export const useRetryOnReconnect = (shouldRetry: () => boolean, retry: () => void) => {
  const wasConnectedRef = useRef<boolean | null>(null)

  // Refs keep the NetInfo subscription stable across renders
  const shouldRetryRef = useRef(shouldRetry)
  shouldRetryRef.current = shouldRetry

  const retryRef = useRef(retry)
  retryRef.current = retry

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(({ isConnected, isInternetReachable }) => {
      const connected = Boolean(isConnected) && isInternetReachable !== false
      const cameOnline = connected && wasConnectedRef.current === false
      wasConnectedRef.current = connected

      if (cameOnline && shouldRetryRef.current()) {
        retryRef.current()
      }
    })

    return unsubscribe
  }, [])
}

export default useRetryOnReconnect

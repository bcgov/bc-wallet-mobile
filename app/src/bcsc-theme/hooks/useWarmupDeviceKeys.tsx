import { TOKENS, useServices } from '@bifold/core'
import { useEffect, useRef, useState } from 'react'
import { createPreVerificationJWT, getAllKeys } from 'react-native-bcsc-core'

/**
 * A custom hook that warms up device keys for BCSC authentication.
 *
 * Why? BCSCCore.generateKeyPair() is a slow operation on Android.
 * It blocks the UI thread and can cause a noticeable delay.
 * Calling this early in the app's lifecycle can help mitigate this delay.
 */
export const useWarmUpDeviceKeys = () => {
  const [loadingDeviceKeys, setLoadingDeviceKeys] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const warmedUp = useRef(false)

  useEffect(() => {
    const warmupKeys = async () => {
      if (warmedUp.current) {
        // Keys already warmed up, no need to warm up again
        return
      }

      setLoadingDeviceKeys(true)
      try {
        const keys = await getAllKeys()

        if (keys.length) {
          // Keys already exist, no need to warm up
          warmedUp.current = true
          return
        }

        logger.info('[useWarmupDeviceKeys] Warming up device keys')

        // TODO (MD): Add explicit function to BCSCCore to warm up device keys.
        // Internally, this will call generateKeyPair() if keys do not exist.
        await createPreVerificationJWT('', '')
        warmedUp.current = true
      } catch (error) {
        logger.error('[useWarmupDeviceKeys] Error warming up device keys', error as Error)
        warmedUp.current = false
      } finally {
        setLoadingDeviceKeys(false)
      }
    }

    warmupKeys()
  }, [logger])

  return { loadingDeviceKeys }
}

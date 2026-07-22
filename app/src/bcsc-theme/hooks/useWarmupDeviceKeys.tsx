import { PersistentStorage, TOKENS, useServices } from '@bifold/core'
import { useEffect, useMemo, useState } from 'react'
import { warmUpKeyPair } from 'react-native-bcsc-core'

const DEVICE_KEYPAIR_GENERATED_KEY = '@bcsc/device-keys-warmed-up'

/**
 * A custom hook that warms up device keys for BCSC authentication.
 *
 * @returns An object containing a boolean indicating whether the device keys are currently being warmed up.
 */
export const useWarmUpDeviceKeys = () => {
  const [warmingUpKeys, setWarminUpKeys] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  useEffect(() => {
    const warmupKeys = async () => {
      try {
        const warmedUp = await PersistentStorage.fetchValueForKey(DEVICE_KEYPAIR_GENERATED_KEY)

        if (warmedUp) {
          logger.info('[useWarmupDeviceKeys] Device keys already warmed up')
          return
        }

        setWarminUpKeys(true)
        logger.info('[useWarmupDeviceKeys] Warming up device keys')
        await warmUpKeyPair()
        await PersistentStorage.storeValueForKey(DEVICE_KEYPAIR_GENERATED_KEY, 'true')
      } catch (error) {
        logger.error('[useWarmupDeviceKeys] Error warming up device keys', error as Error)
      } finally {
        setWarminUpKeys(false)
      }
    }

    warmupKeys()
  }, [logger])

  return useMemo(
    () => ({
      warmingUpKeys,
    }),
    [warmingUpKeys]
  )
}

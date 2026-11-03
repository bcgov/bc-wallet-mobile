import { AppError, ErrorRegistry } from '@/errors'
import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback } from 'react'
import { checkFileSystemFreeStorage } from '../utils/file-info'

export enum MinimumFreeStorageMb {
  SMALL = 25, // ie: Photo uploads
  LARGE = 150, // ie: Video uploads
}

/**
 * Checks if the device has enough free storage space and shows an alert if it is low.
 *
 * @param minFreeMb - The minimum free storage in MB required to continue.
 * @returns A function that resolves to true if there is enough free storage, or false if an alert was shown due to low storage.
 */
export const useEnsureFreeStorage = () => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { deviceStorageFullAlert } = useAlerts()

  // Resolves true when it is safe to continue; shows the alert and resolves false when space is low
  return useCallback(
    /**
     * Ensures that the device has enough free storage space.
     * If the available storage is below the specified minimum, an alert is shown to the user.
     * @param minFreeMb - The minimum free storage in MB required to continue.
     * @returns A promise that resolves to true if there is enough free storage,
     *          or false if an alert was shown due to low storage.
     */
    async (minFreeMb: MinimumFreeStorageMb) => {
      const storage = await checkFileSystemFreeStorage(minFreeMb, logger)
      if (!storage.hasFreeStorage) {
        const appError = AppError.fromErrorDefinition(ErrorRegistry.DEVICE_STORAGE_FULL)

        appError.addContext({
          freeStorageMb: storage.freeStorageMb,
          totalStorageMb: storage.totalStorageMb,
          hasFreeStorage: storage.hasFreeStorage,
          minRequiredMb: minFreeMb,
        })

        deviceStorageFullAlert(appError)
      }
      return storage.hasFreeStorage
    },
    [deviceStorageFullAlert, logger]
  )
}

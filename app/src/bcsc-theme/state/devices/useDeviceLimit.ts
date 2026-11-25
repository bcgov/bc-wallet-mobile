import { useOptionalIdToken } from '@/bcsc-theme/contexts/BCSCIdTokenContext'
import { useMemo } from 'react'
import { DeviceLimitResult } from './device-limit'
import { selectDeviceLimit } from './selectors'

/**
 * Returns the device limit information from the id token.
 *
 * @returns The device limit information.
 */
export const useDeviceLimit = (): DeviceLimitResult => {
  const { idToken } = useOptionalIdToken()

  return useMemo(() => {
    return selectDeviceLimit(idToken)
  }, [idToken])
}

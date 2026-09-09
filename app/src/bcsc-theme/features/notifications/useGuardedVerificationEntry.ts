import useServerStatusCheck from '@/bcsc-theme/hooks/useServerStatusCheck'
import { useCallback } from 'react'

/**
 * Wraps verification CTA (Start / Continue / Pending review / Cancelled
 * review) with an IAS availability check. If IAS is down, the user is shown
 * the service outage modal
 */
export const useGuardedVerificationEntry = () => {
  const { checkServerStatus } = useServerStatusCheck()

  return useCallback(
    (proceed: () => void) => async () => {
      const { isAvailable } = await checkServerStatus()
      if (isAvailable) {
        proceed()
      }
    },
    [checkServerStatus]
  )
}

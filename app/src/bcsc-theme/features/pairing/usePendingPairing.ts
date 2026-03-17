import { useEffect, useState } from 'react'
import { usePairingService } from './PairingServiceContext'

/**
 * Hook to reactively check if there's a pending pairing request.
 */
export const usePendingPairing = () => {
  const service = usePairingService()

  const [hasPending, setHasPending] = useState(service.hasPendingPairing)

  useEffect(() => {
    return service.onPendingStateChange((pending) => {
      setHasPending(pending)
    })
  }, [service])

  return hasPending
}

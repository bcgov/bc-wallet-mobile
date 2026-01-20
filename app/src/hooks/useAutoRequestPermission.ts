import { useEffect, useRef } from 'react'

/**
 * Automatically requests a permission once on mount if not already granted.
 * Ensures the permission is only requested once per component lifecycle.
 *
 * @param hasPermission - Whether the permission is currently granted
 * @param requestPermission - Function to request the permission
 *
 * @example
 * const { hasPermission, requestPermission } = useCameraPermission()
 * useAutoRequestPermission(hasPermission, requestPermission)
 */
export const useAutoRequestPermission = (
  hasPermission: boolean,
  requestPermission: () => Promise<boolean>
): void => {
  const hasRequested = useRef(false)

  useEffect(() => {
    const request = async () => {
      if (!hasPermission && !hasRequested.current) {
        hasRequested.current = true
        await requestPermission()
      }
    }
    request()
  }, [hasPermission, requestPermission])
}

import { useEffect, useRef, useState } from 'react'

/**
 * Automatically requests a permission once on mount if not already granted.
 * Ensures the permission is only requested once per component lifecycle.
 * Returns a loading state to prevent UI flicker during permission requests.
 *
 * @param hasPermission - Whether the permission is currently granted
 * @param requestPermission - Function to request the permission
 * @param enabled - Optional flag to delay the permission request (useful for sequencing multiple permissions)
 * @returns Object with `isLoading` - true while the initial permission request is pending
 *
 * @example
 * // Single permission
 * const { hasPermission, requestPermission } = useCameraPermission()
 * const { isLoading } = useAutoRequestPermission(hasPermission, requestPermission)
 *
 * @example
 * // Multiple permissions (sequenced to avoid dialog conflicts)
 * const { isLoading: isCameraLoading } = useAutoRequestPermission(hasCameraPermission, requestCameraPermission)
 * const { isLoading: isMicLoading } = useAutoRequestPermission(hasMicPermission, requestMicPermission, !isCameraLoading)
 *
 * if (isCameraLoading || isMicLoading) return null
 * if (!hasCameraPermission || !hasMicPermission) return <PermissionDisabled />
 */
export const useAutoRequestPermission = (
  hasPermission: boolean,
  requestPermission: () => Promise<boolean>,
  enabled: boolean = true
): { isLoading: boolean } => {
  const hasRequested = useRef(false)
  const [isLoading, setIsLoading] = useState(!hasPermission)

  useEffect(() => {
    const request = async () => {
      if (!enabled) {
        return
      }
      if (!hasPermission && !hasRequested.current) {
        hasRequested.current = true
        setIsLoading(true)
        await requestPermission()
        setIsLoading(false)
      } else if (hasPermission) {
        setIsLoading(false)
      }
    }
    request()
  }, [hasPermission, requestPermission, enabled])

  return { isLoading }
}

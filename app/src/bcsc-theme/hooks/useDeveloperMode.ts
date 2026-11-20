import { useBCSCStore } from '@/bcsc-theme/storage'
import { useCallback, useRef } from 'react'

const TOUCH_COUNT_TO_ENABLE_DEVELOPER_MODE = 10

// Bifold's useDeveloperMode, writing to the BCSC store
export const useDeveloperMode = (onDevModeTriggered?: () => void) => {
  const developerOptionCount = useRef(0)
  const setDeveloperMode = useBCSCStore((s) => s.preferences.setDeveloperMode)

  const incrementDeveloperMenuCounter = useCallback(() => {
    if (developerOptionCount.current >= TOUCH_COUNT_TO_ENABLE_DEVELOPER_MODE) {
      developerOptionCount.current = 0
      void setDeveloperMode(true)
      onDevModeTriggered?.()
    } else {
      developerOptionCount.current = developerOptionCount.current + 1
    }
  }, [setDeveloperMode, onDevModeTriggered])

  return { incrementDeveloperMenuCounter }
}

export const clearTimeoutIfExists = (timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }
}

export const clearIntervalIfExists = (intervalRef: React.MutableRefObject<NodeJS.Timeout | null>) => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }
}

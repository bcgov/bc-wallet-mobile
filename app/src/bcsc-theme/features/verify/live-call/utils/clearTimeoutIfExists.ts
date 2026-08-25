export const clearTimeoutIfExists = (timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }
}

export const clearIntervalIfExists = (intervalRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }
}

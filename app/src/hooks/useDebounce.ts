import { useEffect, useState } from 'react'

/**
 * A custom React hook that debounces a value.
 *
 * @template T The type of the value to be debounced.
 * @param {T} value The value to be debounced.
 * @param {number} delayMs The debounce delay in milliseconds.
 * @returns {*} {T} The debounced value.
 */
export const useDebounce = <T>(value: T, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const debounceHandler = setTimeout(() => setDebouncedValue(value), delayMs)

    // Cleanup timeout if value or delay changes
    return () => clearTimeout(debounceHandler)
  }, [value, delayMs])

  return debouncedValue
}

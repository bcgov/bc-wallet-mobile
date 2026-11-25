import { useEffect, useState } from 'react'

/**
 * A custom React hook that debounces a value.
 *
 * @typeParam T - The type of the value to be debounced.
 * @param value - The value to be debounced.
 * @param delayMs - The debounce delay in milliseconds.
 * @returns The debounced value.
 */
export const useDebounce = <T,>(value: T, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const debounceHandler = setTimeout(() => setDebouncedValue(value), delayMs)

    return () => clearTimeout(debounceHandler)
  }, [value, delayMs])

  return debouncedValue
}

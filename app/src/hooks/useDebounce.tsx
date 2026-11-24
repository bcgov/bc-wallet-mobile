import { useEffect, useState } from 'react'

/**
 * A custom React hook that debounces a value.
 *
 * @template T The type of the value to be debounced.
 */
export const useDebounce = <T,>(value: T, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const debounceHandler = setTimeout(() => setDebouncedValue(value), delayMs)

    return () => clearTimeout(debounceHandler)
  }, [value, delayMs])

  return debouncedValue
}

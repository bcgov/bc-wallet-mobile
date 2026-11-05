export type RetryOptions = {
  attempts: number
  retryDelayMs: number
  /** Whether to retry if the result is null or undefined (default: false). */
  retryIfNullish?: boolean
  /** Determines whether to retry based on the error (default: every error is retried). */
  shouldRetry?: (error: unknown) => boolean
}

/**
 * Retries a callback function a specified number of times with a delay between each attempt.
 *
 * @param callback - The asynchronous function to be retried.
 * @param options - The retry settings, see {@link RetryOptions}.
 * @returns A promise that resolves to the result of the callback function, or rejects with an error if all retries fail.
 */
export const retryAsync = async <T>(callback: () => Promise<T>, options: RetryOptions): Promise<T> => {
  const { attempts, retryDelayMs, retryIfNullish = false, shouldRetry = () => true } = options

  try {
    if (attempts < 1) {
      throw new Error('[retryAsync]: attempts < 1')
    }

    const result = await callback()

    if (result == null && retryIfNullish && attempts > 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      return retryAsync(callback, { ...options, attempts: attempts - 1 })
    }

    return result
  } catch (error) {
    if (attempts > 1 && shouldRetry(error)) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      return retryAsync(callback, { ...options, attempts: attempts - 1 })
    }

    throw error
  }
}

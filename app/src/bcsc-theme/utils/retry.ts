export type RetryInfo = {
  attempt: number
  error: unknown
}

export type RetryOptions = {
  attempts: number
  retryDelayMs: number
  /** Whether to retry if the result is null or undefined (default: false). */
  retryIfNullish?: boolean
  /** Determines whether to retry based on the error (default: every error is retried). */
  shouldRetry?: (error: unknown) => boolean
  /**
   * Called once per retry that is actually going to happen (never after the final attempt, or when
   * shouldRetry declines), before the delay. Use it for per-retry logging.
   */
  onRetry?: (info: RetryInfo) => void
}

/**
 * Retries a callback function a specified number of times with a delay between each attempt.
 *
 * @param callback - The asynchronous function to be retried.
 * @param options - The retry settings, see {@link RetryOptions}.
 * @returns A promise that resolves to the result of the callback function, or rejects with an error if all retries fail.
 */
export const retryAsync = async <T>(callback: () => Promise<T>, options: RetryOptions): Promise<T> => {
  const { attempts, retryDelayMs, retryIfNullish = false, shouldRetry = () => true, onRetry } = options

  if (attempts < 1) {
    throw new Error('[retryAsync]: attempts < 1')
  }

  for (let attempt = 1; ; attempt++) {
    const isLastAttempt = attempt >= attempts
    let retryError: unknown

    try {
      const result = await callback()

      if (result != null || !retryIfNullish || isLastAttempt) {
        return result
      }
    } catch (error) {
      if (isLastAttempt || !shouldRetry(error)) {
        throw error
      }

      retryError = error
    }

    // Outside the try so an onRetry failure isn't mistaken for a callback failure
    onRetry?.({ attempt, error: retryError })
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
  }
}

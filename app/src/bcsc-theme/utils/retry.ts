/**
 * Retries a callback function a specified number of times with a delay between each attempt.
 *
 * @param callback - The asynchronous function to be retried.
 * @param attempts - The number of attempts.
 * @param retryMs - The delay in milliseconds between each retry attempt.
 * @param retryIfNullish - Whether to retry if the result is null or undefined (default: false).
 * @returns A promise that resolves to the result of the callback function, or rejects with an error if all retries fail.
 */
export const retryAsync = async <T>(
  callback: () => Promise<T>,
  attempts: number,
  retryMs: number,
  retryIfNullish = false
): Promise<T> => {
  try {
    if (attempts < 1) {
      throw new Error('[retryAsync]: attempts < 1')
    }

    const result = await callback()

    if (result == null && retryIfNullish && attempts > 1) {
      await new Promise((resolve) => setTimeout(resolve, retryMs))
      return retryAsync(callback, attempts - 1, retryMs, retryIfNullish)
    }

    return result
  } catch (error) {
    if (attempts > 1) {
      await new Promise((resolve) => setTimeout(resolve, retryMs))
      return retryAsync(callback, attempts - 1, retryMs)
    }

    throw error
  }
}

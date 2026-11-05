import { retryAsync } from './retry'

describe('retryAsync', () => {
  it('attempts the request the specified number of times', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    await expect(retryAsync(fn, { attempts: 3, retryDelayMs: 100 })).rejects.toThrow('Failed')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('succeeds if the request eventually succeeds', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce('Success')

    const result = await retryAsync(fn, { attempts: 3, retryDelayMs: 100 })

    expect(result).toBe('Success')
  })

  it('throws an error if the request fails after all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    await expect(retryAsync(fn, { attempts: 2, retryDelayMs: 100 })).rejects.toThrow('Failed')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries if retryIfNullish is true and the result is null', async () => {
    const fn = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('Success')

    const result = await retryAsync(fn, { attempts: 3, retryDelayMs: 100, retryIfNullish: true })

    expect(result).toBe('Success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  describe('with a mocked clock', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('waits the specified delay between retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failed'))
      const delay = 100

      const promise = retryAsync(fn, { attempts: 3, retryDelayMs: delay }).catch(() => {})

      // First attempt is immediate
      expect(fn).toHaveBeenCalledTimes(1)

      // Advance past first delay
      await jest.advanceTimersByTimeAsync(delay)
      expect(fn).toHaveBeenCalledTimes(2)

      // Advance past second delay
      await jest.advanceTimersByTimeAsync(delay)
      expect(fn).toHaveBeenCalledTimes(3)

      await promise
    })
  })

  it('stops retrying and rethrows when shouldRetry returns false', async () => {
    const error = new Error('Not retryable')
    const fn = jest.fn().mockRejectedValue(error)
    const shouldRetry = jest.fn().mockReturnValue(false)

    await expect(retryAsync(fn, { attempts: 3, retryDelayMs: 100, shouldRetry })).rejects.toBe(error)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(shouldRetry).toHaveBeenCalledWith(error)
  })

  it('retries while shouldRetry returns true', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('Transient')).mockResolvedValueOnce('Success')
    const shouldRetry = jest.fn().mockReturnValue(true)

    const result = await retryAsync(fn, { attempts: 3, retryDelayMs: 100, shouldRetry })

    expect(result).toBe('Success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not call shouldRetry on the last attempt', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))
    const shouldRetry = jest.fn().mockReturnValue(true)

    await expect(retryAsync(fn, { attempts: 2, retryDelayMs: 100, shouldRetry })).rejects.toThrow('Failed')
    expect(shouldRetry).toHaveBeenCalledTimes(1)
  })

  it('preserves retryIfNullish after an error recovery', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('Success')

    const result = await retryAsync(fn, { attempts: 3, retryDelayMs: 100, retryIfNullish: true })

    expect(result).toBe('Success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it.each([0, -1])('throws an error if maxRetries is %s', async (maxRetries) => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    await expect(retryAsync(fn, { attempts: maxRetries, retryDelayMs: 100 })).rejects.toThrow(
      '[retryAsync]: attempts < 1'
    )
    expect(fn).not.toHaveBeenCalled()
  })
})

import { retryAsync } from './retry'

describe('retryAsync', () => {
  it('attempts the request the specified number of times', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    await expect(retryAsync(fn, 3, 100)).rejects.toThrow('Failed')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('succeeds if the request eventually succeeds', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce('Success')

    const result = await retryAsync(fn, 3, 100)

    expect(result).toBe('Success')
  })

  it('throws an error if the request fails after all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    await expect(retryAsync(fn, 2, 100)).rejects.toThrow('Failed')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries if retryIfNullish is true and the result is null', async () => {
    const fn = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('Success')

    const result = await retryAsync(fn, 3, 100, true)

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

      const promise = retryAsync(fn, 3, delay).catch(() => {})

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

  it('preserves retryIfNullish after an error recovery', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('Success')

    const result = await retryAsync(fn, 3, 100, true)

    expect(result).toBe('Success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it.each([0, -1])('throws an error if maxRetries is %s', async (maxRetries) => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    await expect(retryAsync(fn, maxRetries, 100)).rejects.toThrow('[retryAsync]: attempts < 1')
    expect(fn).not.toHaveBeenCalled()
  })
})

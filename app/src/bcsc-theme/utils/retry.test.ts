import { retryAsync } from './retry'

describe('retryAsync', () => {
  it('attempts the request the specified number of times', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    try {
      await retryAsync(fn, 3, 100)
    } catch (error) {
      expect(error).toEqual(new Error('Failed'))
      expect(fn).toHaveBeenCalledTimes(3)
    }
  })

  it('succeeds if the request eventually succeeds', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce('Success')

    const result = await retryAsync(fn, 3, 100)

    expect(result).toBe('Success')
  })

  it('throws an error if the request fails after all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    try {
      await retryAsync(fn, 2, 100)
    } catch (error) {
      expect(error).toEqual(new Error('Failed'))
      expect(fn).toHaveBeenCalledTimes(2)
    }
  })

  it('retrys if retryIfNullish is true and the result is null', async () => {
    const fn = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('Success')

    const result = await retryAsync(fn, 3, 100, true)

    expect(result).toBe('Success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('waits the specified delay between retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))
    const delay = 100
    const startTime = Date.now()

    try {
      await retryAsync(fn, 3, delay)
    } catch (error) {
      const endTime = Date.now()
      const elapsedTime = endTime - startTime
      // Attempt 1: Immediate -> Attempt 2: After delay -> Attempt 3: After delay
      expect(elapsedTime).toBeGreaterThanOrEqual(delay * 2)
    }
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

  it('throws an error if maxRetries is set to 0', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    try {
      await retryAsync(fn, 0, 100)
    } catch (error) {
      expect(error).toEqual(new Error('[retryAsync]: attempts < 1'))
    }
  })

  it('throws an error if maxRetries is negative', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failed'))

    try {
      await retryAsync(fn, -1, 100)
    } catch (error) {
      expect(error).toEqual(new Error('[retryAsync]: attempts < 1'))
    }
  })
})

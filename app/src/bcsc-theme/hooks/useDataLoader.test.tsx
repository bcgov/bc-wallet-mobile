import { act, renderHook, waitFor } from '@testing-library/react-native'
import useDataLoader from './useDataLoader'

/** A fetch whose settlement the test controls. */
const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve))

describe('useDataLoader', () => {
  describe('reset', () => {
    it('forgets the data and lets load fetch again', async () => {
      const fetchData = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
      const { result } = renderHook(() => useDataLoader(fetchData, { onError: jest.fn() }))

      act(() => result.current.load())
      await waitFor(() => expect(result.current.data).toBe('first'))
      expect(result.current.isReady).toBe(true)

      act(() => result.current.reset())

      expect(result.current.data).toBeUndefined()
      expect(result.current.isReady).toBe(false)

      // load() runs once only, until a reset
      act(() => result.current.load())

      await waitFor(() => expect(result.current.data).toBe('second'))
      expect(fetchData).toHaveBeenCalledTimes(2)
    })

    it('discards a fetch that lands after the reset', async () => {
      const fetch = deferred<string>()
      const { result } = renderHook(() => useDataLoader(() => fetch.promise, { onError: jest.fn() }))

      act(() => result.current.load())
      expect(result.current.isLoading).toBe(true)

      act(() => result.current.reset())
      expect(result.current.isLoading).toBe(false)

      await act(async () => {
        fetch.resolve('stale')
        await flushPromises()
      })

      expect(result.current.data).toBeUndefined()
      expect(result.current.isReady).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('discards an error that lands after the reset, without reporting it', async () => {
      const fetch = deferred<string>()
      const onError = jest.fn()
      const { result } = renderHook(() => useDataLoader(() => fetch.promise, { onError }))

      act(() => result.current.load())
      act(() => result.current.reset())

      await act(async () => {
        fetch.reject(new Error('stale'))
        await flushPromises()
      })

      expect(result.current.error).toBeUndefined()
      expect(onError).not.toHaveBeenCalled()
    })

    it('keeps a load started after the reset when the stale one lands later', async () => {
      const stale = deferred<string>()
      const fetchData = jest.fn().mockReturnValueOnce(stale.promise).mockResolvedValueOnce('fresh')
      const { result } = renderHook(() => useDataLoader(fetchData, { onError: jest.fn() }))

      act(() => result.current.load())
      act(() => result.current.reset())
      act(() => result.current.load())
      await waitFor(() => expect(result.current.data).toBe('fresh'))

      await act(async () => {
        stale.resolve('stale')
        await flushPromises()
      })

      expect(result.current.data).toBe('fresh')
      expect(result.current.isReady).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })
})

import { act, renderHook } from '@testing-library/react-native'
import useDataLoader from './useDataLoader'

const advance = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms)
  })

describe('useDataLoader retry', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('waits twice as long before each new attempt, then loads the data', async () => {
    const fetchData = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('data')
    const onError = jest.fn()
    const { result } = renderHook(() =>
      useDataLoader(fetchData, { onError, retryConfig: { interval: 1000, timeout: 10000 } })
    )

    act(() => result.current.load())

    await advance(999)
    expect(fetchData).toHaveBeenCalledTimes(1)

    await advance(1)
    expect(fetchData).toHaveBeenCalledTimes(2)

    await advance(1999)
    expect(fetchData).toHaveBeenCalledTimes(2)

    await advance(1)
    expect(fetchData).toHaveBeenCalledTimes(3)
    expect(result.current.data).toBe('data')
    expect(result.current.isLoading).toBe(false)
    expect(onError).not.toHaveBeenCalled()
  })

  it('reports a timeout carrying the last error once the time runs out', async () => {
    const fetchData = jest.fn().mockRejectedValue(new Error('offline'))
    const onError = jest.fn()
    const { result } = renderHook(() =>
      useDataLoader(fetchData, { onError, retryConfig: { interval: 1000, timeout: 2500 } })
    )

    act(() => result.current.load())

    // The second wait is cut to the time that is left: 1000ms, then 1500ms rather than 2000ms
    await advance(2500)

    expect(fetchData).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(new Error('Operation timed out after 2500msError: offline'))
    expect(result.current.error).toEqual(new Error('Operation timed out after 2500msError: offline'))
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('does not retry a failure that lands after the timeout', async () => {
    const fetchData = jest.fn(
      () => new Promise<string>((_resolve, reject) => setTimeout(() => reject(new Error('slow')), 3000))
    )
    const onError = jest.fn()
    const { result } = renderHook(() =>
      useDataLoader(fetchData, { onError, retryConfig: { interval: 1000, timeout: 2500 } })
    )

    act(() => result.current.load())
    await advance(3000)

    expect(fetchData).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(new Error('Operation timed out after 2500msError: slow'))
    expect(result.current.isLoading).toBe(false)
  })
})

import NetInfo, { NetInfoChangeHandler, NetInfoState } from '@react-native-community/netinfo'
import { renderHook } from '@testing-library/react-native'
import { useRetryOnReconnect } from './useRetryOnReconnect'

const netInfoState = (isConnected: boolean, isInternetReachable: boolean | null = isConnected) =>
  ({ isConnected, isInternetReachable }) as NetInfoState

describe('useRetryOnReconnect', () => {
  let netInfoListener: NetInfoChangeHandler

  beforeEach(() => {
    jest.clearAllMocks()
    ;(NetInfo.addEventListener as jest.Mock).mockImplementation((listener: NetInfoChangeHandler) => {
      netInfoListener = listener
      return jest.fn()
    })
  })

  it('should retry when connectivity is restored and shouldRetry returns true', () => {
    const retry = jest.fn()
    renderHook(() => useRetryOnReconnect(() => true, retry))

    netInfoListener(netInfoState(false))
    netInfoListener(netInfoState(true))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('should not retry when shouldRetry returns false', () => {
    const retry = jest.fn()
    renderHook(() => useRetryOnReconnect(() => false, retry))

    netInfoListener(netInfoState(false))
    netInfoListener(netInfoState(true))

    expect(retry).not.toHaveBeenCalled()
  })

  it('should not retry without an offline-to-online transition', () => {
    const retry = jest.fn()
    renderHook(() => useRetryOnReconnect(() => true, retry))

    // Initial state online, stays online
    netInfoListener(netInfoState(true))
    netInfoListener(netInfoState(true))

    expect(retry).not.toHaveBeenCalled()
  })

  it('should not treat connected-but-unreachable as online', () => {
    const retry = jest.fn()
    renderHook(() => useRetryOnReconnect(() => true, retry))

    netInfoListener(netInfoState(false))
    // Connected to a network, but internet not reachable yet
    netInfoListener(netInfoState(true, false))

    expect(retry).not.toHaveBeenCalled()

    // Internet becomes reachable
    netInfoListener(netInfoState(true, true))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('should retry on each reconnect while shouldRetry remains true', () => {
    const retry = jest.fn()
    renderHook(() => useRetryOnReconnect(() => true, retry))

    netInfoListener(netInfoState(false))
    netInfoListener(netInfoState(true))
    netInfoListener(netInfoState(false))
    netInfoListener(netInfoState(true))

    expect(retry).toHaveBeenCalledTimes(2)
  })

  it('should unsubscribe from NetInfo on unmount', () => {
    const removeListener = jest.fn()
    ;(NetInfo.addEventListener as jest.Mock).mockReturnValue(removeListener)

    const { unmount } = renderHook(() => useRetryOnReconnect(() => true, jest.fn()))
    unmount()

    expect(removeListener).toHaveBeenCalled()
  })
})

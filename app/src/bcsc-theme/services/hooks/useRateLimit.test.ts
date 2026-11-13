import { RateLimitedAction, RateLimitWaitType } from '@/bcsc-theme/state/rate-limit/rate-limit'
import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { BCDispatchAction, BCState, initialState } from '@/store'
import { renderHook } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { useRateLimit } from './useRateLimit'

const mockDispatch = jest.fn()
const mockLogger = { warn: jest.fn() }
let mockState: BCState

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useStore: () => [mockState, mockDispatch],
  useServices: () => [mockLogger],
}))

const NOW = new Date('2026-01-01T00:00:00.000Z')

const buildError = (status: number, headers?: Record<string, unknown>) =>
  new AppError(
    'rate limited',
    { category: ErrorCategory.NETWORK, appEvent: AppEventCode.ERR_212_RETRY_LATER, statusCode: 2109 },
    {
      cause: new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, undefined, { status, headers } as any),
      track: false,
    }
  )

describe('useRateLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(NOW)
    mockState = initialState
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('recordRateLimit', () => {
    it.each([
      [RateLimitedAction.CardAdd, 503],
      [RateLimitedAction.QRTransfer, 429],
      [RateLimitedAction.Email, 429],
    ])('stores now + Retry-After for %s on %i', (action, status) => {
      const { result } = renderHook(() => useRateLimit())

      result.current.recordRateLimit(action, buildError(status, { 'retry-after': '600' }))

      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.RATE_LIMIT_RECEIVED,
        payload: [{ action, retryAt: '2026-01-01T00:10:00.000Z' }],
      })
    })

    it.each([
      ['no header', buildError(503)],
      ['an unusable header', buildError(503, { 'retry-after': 'soon' })],
      ['a zero header', buildError(503, { 'retry-after': '0' })],
    ])('stores nothing and warns without leaking the error for %s', (_label, error) => {
      const { result } = renderHook(() => useRateLimit())

      result.current.recordRateLimit(RateLimitedAction.CardAdd, error)

      expect(mockDispatch).not.toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(String))
    })

    it.each([
      ['another status', buildError(500, { 'retry-after': '600' })],
      ['a 429 on card add', buildError(429, { 'retry-after': '600' })],
      ['a non-HTTP error', new Error('boom')],
      ['a non-error', undefined],
    ])('stores nothing for %s', (_label, error) => {
      const { result } = renderHook(() => useRateLimit())

      result.current.recordRateLimit(RateLimitedAction.CardAdd, error)

      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('getWait', () => {
    it('reads the clock at call time', () => {
      mockState = {
        ...initialState,
        bcsc: { ...initialState.bcsc, rateLimitRetryAt: { [RateLimitedAction.CardAdd]: '2026-01-01T00:10:00.000Z' } },
      }
      const { result } = renderHook(() => useRateLimit())

      expect(result.current.getWait(RateLimitedAction.CardAdd)).toMatchObject({
        type: RateLimitWaitType.Waiting,
        minutes: 10,
      })

      jest.setSystemTime(new Date('2026-01-01T00:10:00.000Z'))

      expect(result.current.getWait(RateLimitedAction.CardAdd)).toEqual({ type: RateLimitWaitType.None })
    })

    it('keeps its functions stable across store updates and sees the latest store', () => {
      const { result, rerender } = renderHook(() => useRateLimit())
      const first = result.current

      mockState = {
        ...initialState,
        bcsc: { ...initialState.bcsc, rateLimitRetryAt: { [RateLimitedAction.Email]: '2026-01-01T00:05:00.000Z' } },
      }
      rerender({})

      expect(result.current).toBe(first)
      expect(result.current.getWait(RateLimitedAction.Email)).toMatchObject({ type: RateLimitWaitType.Waiting })
    })
  })
})

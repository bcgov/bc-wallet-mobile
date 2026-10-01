import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { AxiosError } from 'axios'
import { getVideoServiceUnavailability } from './serviceUnavailability'

const axiosAppError = (status: number, headers: Record<string, string> = {}) =>
  new AppError(
    'Request failed',
    { category: ErrorCategory.GENERAL, appEvent: AppEventCode.GENERAL, statusCode: 2000 },
    {
      cause: new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status,
        headers,
      } as any),
      track: false,
    }
  )

describe('getVideoServiceUnavailability', () => {
  it('treats 553 as all agents busy', () => {
    expect(getVideoServiceUnavailability(axiosAppError(553))).toEqual({ busy: true })
  })

  it('treats 503 without Retry-After as all agents busy', () => {
    expect(getVideoServiceUnavailability(axiosAppError(503))).toEqual({ busy: true })
  })

  it('treats 503 with a delay-seconds Retry-After as closed', () => {
    expect(getVideoServiceUnavailability(axiosAppError(503, { 'retry-after': '3600' }))).toEqual({ busy: false })
  })

  it('treats 503 with an HTTP-date Retry-After as closed', () => {
    expect(
      getVideoServiceUnavailability(axiosAppError(503, { 'retry-after': 'Wed, 30 Sep 2026 15:00:00 GMT' }))
    ).toEqual({ busy: false })
  })

  it('treats 503 with a zero or unparseable Retry-After as all agents busy', () => {
    expect(getVideoServiceUnavailability(axiosAppError(503, { 'retry-after': '0' }))).toEqual({ busy: true })
    expect(getVideoServiceUnavailability(axiosAppError(503, { 'retry-after': 'soon' }))).toEqual({ busy: true })
  })

  it('returns null for other failures', () => {
    expect(getVideoServiceUnavailability(axiosAppError(500))).toBeNull()
    expect(getVideoServiceUnavailability(new Error('network'))).toBeNull()
  })
})

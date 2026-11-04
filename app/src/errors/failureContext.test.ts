import { AppError } from './appError'
import { ErrorRegistry } from './errorRegistry'
import { createFailureError } from './failureContext'

describe('createFailureError', () => {
  it('records the flow, step and cause', () => {
    const cause = new Error('signing failed')

    const error = createFailureError(ErrorRegistry.LOGIN_SERVER_ERROR, { flow: 'quick_login', step: 'sign_jwt', cause })

    expect(error.statusCode).toBe(2204)
    expect(error.cause).toBe(cause)
    expect(error.context).toEqual({ failure_flow: 'quick_login', failure_step: 'sign_jwt' })
  })

  it('records how long the flow ran before failing', () => {
    jest.spyOn(Date, 'now').mockReturnValue(5000)

    const error = createFailureError(ErrorRegistry.LOGIN_SERVER_ERROR, { flow: 'f', step: 's', startedAt: 2000 })

    expect(error.context.failure_elapsed_ms).toBe(3000)
    jest.restoreAllMocks()
  })

  it('records the code of an AppError cause, which technicalMessage does not carry', () => {
    const cause = AppError.fromErrorDefinition(ErrorRegistry.NO_SIGNING_KEYS, { track: false })

    const error = createFailureError(ErrorRegistry.LOGIN_DEVICE_ERROR, { flow: 'f', step: 's', cause })

    expect(error.context.failure_cause_code).toBe(cause.code)
  })

  it('records the code of a native module error cause', () => {
    const cause = Object.assign(new Error('No keys available'), { code: 'E_NO_KEYS_FOUND' })

    const error = createFailureError(ErrorRegistry.LOGIN_DEVICE_ERROR, { flow: 'f', step: 's', cause })

    expect(error.context.failure_cause_code).toBe('E_NO_KEYS_FOUND')
  })

  it('keeps the HTTP details of an AppError cause', () => {
    const cause = AppError.fromErrorDefinition(ErrorRegistry.SERVER_ERROR, {
      context: { http_route: '/device/jwk', http_method: 'GET', http_status: 503, http_response_size: 10 },
    })

    const error = createFailureError(ErrorRegistry.MISSING_JWK_ERROR, { flow: 'f', step: 's', cause })

    expect(error.context).toEqual({
      failure_flow: 'f',
      failure_step: 's',
      failure_cause_code: cause.code,
      http_route: '/device/jwk',
      http_method: 'GET',
      http_status: 503,
    })
  })
})

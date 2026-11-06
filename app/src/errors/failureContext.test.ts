import { AppError } from './appError'
import { ErrorRegistry } from './errorRegistry'
import { createFailureError, trackFailureSteps } from './failureContext'

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

  it("leaves an AppError cause's context on the cause, where the chained context reads it", () => {
    const cause = AppError.fromErrorDefinition(ErrorRegistry.SERVER_ERROR, {
      context: { http_route: '/device/jwk', http_status: 503, push_fcm_status: 'fetch_failed' },
      track: false,
    })

    const error = createFailureError(ErrorRegistry.MISSING_JWK_ERROR, { flow: 'f', step: 's', cause })

    expect(error.context).toEqual({ failure_flow: 'f', failure_step: 's', failure_cause_code: cause.code })
    expect(error.getChainedContext()).toMatchObject({
      http_route: '/device/jwk',
      http_status: 503,
      push_fcm_status: 'fetch_failed',
      failure_step: 's',
    })
  })

  it('adds extra diagnostics without letting them override the failure location', () => {
    const error = createFailureError(ErrorRegistry.LOGIN_SERVER_ERROR, {
      flow: 'quick_login',
      step: 'account',
      context: { account_read_status: 'account_decode_failed', failure_step: 'overridden' },
    })

    expect(error.context).toEqual({
      failure_flow: 'quick_login',
      failure_step: 'account',
      account_read_status: 'account_decode_failed',
    })
  })
})

describe('trackFailureSteps', () => {
  type Step = 'first' | 'second'
  const track = () => trackFailureSteps<Step>('test_flow', { definition: ErrorRegistry.LOGIN_DEVICE_ERROR })

  const rejection = async (promise: Promise<unknown>): Promise<AppError> => {
    try {
      await promise
    } catch (error) {
      return error as AppError
    }
    throw new Error('Expected the step to reject')
  }

  afterEach(() => jest.restoreAllMocks())

  it('returns the result of a step that succeeds', async () => {
    await expect(track().run('first', async () => 'value')).resolves.toBe('value')
  })

  it("wraps a failure in the flow's definition, recording the step and time since the flow started", async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000)
    const steps = track()
    jest.spyOn(Date, 'now').mockReturnValue(1250)
    const cause = new Error('boom')

    const error = await rejection(steps.run('first', () => Promise.reject(cause)))

    expect(error.appEvent).toBe(ErrorRegistry.LOGIN_DEVICE_ERROR.appEvent)
    expect(error.cause).toBe(cause)
    expect(error.context).toMatchObject({ failure_flow: 'test_flow', failure_step: 'first', failure_elapsed_ms: 250 })
  })

  it("uses a step's own definition over the flow's", () => {
    const error = track().fail('first', new Error('no key'), { definition: ErrorRegistry.MISSING_JWK_ERROR })

    expect(error.appEvent).toBe(ErrorRegistry.MISSING_JWK_ERROR.appEvent)
  })

  it('labels a handled error in place, keeping its code and handled flag so callers skip alerting again', async () => {
    const handled = AppError.fromErrorDefinition(ErrorRegistry.INVALID_PAIRING_CODE, { track: false })
    handled.handled = true

    const error = await rejection(track().run('first', () => Promise.reject(handled)))

    expect(error).toBe(handled)
    expect(error.handled).toBe(true)
    expect(error.appEvent).toBe(ErrorRegistry.INVALID_PAIRING_CODE.appEvent)
    expect(error.context).toMatchObject({ failure_flow: 'test_flow', failure_step: 'first' })
  })

  it('keeps the innermost step of a handled error when steps are nested', async () => {
    const handled = AppError.fromErrorDefinition(ErrorRegistry.INVALID_PAIRING_CODE, { track: false })
    handled.handled = true
    const steps = track()

    const error = await rejection(steps.run('first', () => steps.run('second', () => Promise.reject(handled))))

    expect(error).toBe(handled)
    expect(error.handled).toBe(true)
    expect(error.context.failure_step).toBe('second')
  })

  it('keeps the innermost step when steps are nested', async () => {
    const steps = track()

    const error = await rejection(
      steps.run('first', () => steps.run('second', () => Promise.reject(new Error('inner'))))
    )

    expect(error.context.failure_step).toBe('second')
    expect((error.cause as Error).message).toBe('inner')
  })

  it("with keepAppError, keeps an AppError's own code and adds where it failed", async () => {
    const requestError = AppError.fromErrorDefinition(ErrorRegistry.NO_INTERNET, { track: false })

    const error = await rejection(track().run('second', () => Promise.reject(requestError), { keepAppError: true }))

    expect(error).toBe(requestError)
    expect(error.context).toMatchObject({
      failure_flow: 'test_flow',
      failure_step: 'second',
      failure_cause_code: requestError.code,
    })
  })

  it('leaves an error unchanged when an error it wraps is already labeled', () => {
    const steps = track()
    const labeled = steps.fail('second', new Error('inner'))
    const wrapper = AppError.fromErrorDefinition(ErrorRegistry.LOGIN_SERVER_ERROR, { cause: labeled, track: false })

    const error = steps.fail('first', wrapper)

    expect(error).toBe(wrapper)
    expect(error.context.failure_step).toBeUndefined()
    expect(error.getChainedContext().failure_step).toBe('second')
  })

  it('with keepAppError, still wraps an error that is not an AppError', () => {
    const cause = new Error('native')

    const error = track().fail('second', cause, { keepAppError: true })

    expect(error.appEvent).toBe(ErrorRegistry.LOGIN_DEVICE_ERROR.appEvent)
    expect(error.cause).toBe(cause)
  })

  it("adds a step's context to a failure it wraps, without letting it override the step", () => {
    const error = track().fail('second', new Error('native'), {
      context: { push_fcm_status: 'fetch_failed', failure_step: 'overridden' },
    })

    expect(error.context).toMatchObject({ failure_step: 'second', push_fcm_status: 'fetch_failed' })
  })

  it("adds a step's context to an AppError it labels in place", async () => {
    const cause = AppError.fromErrorDefinition(ErrorRegistry.NO_INTERNET, { track: false })

    const error = await rejection(
      track().run('second', () => Promise.reject(cause), {
        keepAppError: true,
        context: { push_apns_status: 'missing' },
      })
    )

    expect(error).toBe(cause)
    expect(error.context).toMatchObject({ failure_step: 'second', push_apns_status: 'missing' })
  })

  it("adds a step's context only to failures at that step", async () => {
    const steps = track()

    const error = await rejection(
      steps.run('first', () =>
        steps.run('second', () => Promise.reject(new Error('inner')), { context: { push_fcm_status: 'ok' } })
      )
    )
    const other = steps.fail('first', new Error('elsewhere'))

    expect(error.context.push_fcm_status).toBe('ok')
    expect(other.context.push_fcm_status).toBeUndefined()
  })
})

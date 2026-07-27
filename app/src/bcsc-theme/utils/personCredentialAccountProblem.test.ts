import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { getPersonCredentialAccountProblem } from './personCredentialAccountProblem'

const newAppError = (): AppError =>
  new AppError(
    'test error',
    { category: ErrorCategory.CREDENTIAL, appEvent: AppEventCode.UNKNOWN_SERVER_ERROR, statusCode: 9999 },
    { track: false }
  )

const axiosCause = (status: number, data: unknown) =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: { status, data },
  })

describe('getPersonCredentialAccountProblem', () => {
  it('returns "suspended" for a 400 with a "suspended" error_description', () => {
    const error = newAppError()
    error.cause = axiosCause(400, { error: 'unauthorized_client', error_description: 'suspended' })

    expect(getPersonCredentialAccountProblem(error)).toBe('suspended')
  })

  it('returns "deactivated" for a 400 with a "deactivated" error_description', () => {
    const error = newAppError()
    error.cause = axiosCause(400, { error: 'unauthorized_client', error_description: 'deactivated' })

    expect(getPersonCredentialAccountProblem(error)).toBe('deactivated')
  })

  it('matches case-insensitively', () => {
    const error = newAppError()
    error.cause = axiosCause(400, { error: 'unauthorized_client', error_description: 'Account SUSPENDED' })

    expect(getPersonCredentialAccountProblem(error)).toBe('suspended')
  })

  it('returns undefined when error is not "unauthorized_client", even if error_description mentions suspended/deactivated', () => {
    const error = newAppError()
    error.cause = axiosCause(400, { error: 'some_other_error', error_description: 'account suspended' })

    expect(getPersonCredentialAccountProblem(error)).toBeUndefined()
  })

  it('returns undefined when error is missing, even if error_description mentions suspended/deactivated', () => {
    const error = newAppError()
    error.cause = axiosCause(400, { error_description: 'account deactivated' })

    expect(getPersonCredentialAccountProblem(error)).toBeUndefined()
  })

  it('returns undefined for a non-400 status', () => {
    const error = newAppError()
    error.cause = axiosCause(401, { error_description: 'suspended' })

    expect(getPersonCredentialAccountProblem(error)).toBeUndefined()
  })

  it('returns undefined when error_description does not mention suspended/deactivated', () => {
    const error = newAppError()
    error.cause = axiosCause(400, { error: 'unauthorized_client', error_description: 'some_other_reason' })

    expect(getPersonCredentialAccountProblem(error)).toBeUndefined()
  })

  it('returns undefined when error_description is missing', () => {
    const error = newAppError()
    error.cause = axiosCause(400, { error: 'unauthorized_client' })

    expect(getPersonCredentialAccountProblem(error)).toBeUndefined()
  })

  it('returns undefined when error_description is not a string', () => {
    const error = newAppError()
    error.cause = axiosCause(400, { error: 'unauthorized_client', error_description: { nested: 'suspended' } })

    expect(getPersonCredentialAccountProblem(error)).toBeUndefined()
  })

  it('returns undefined when the cause is not an axios error', () => {
    const error = newAppError()
    error.cause = new Error('not axios')

    expect(getPersonCredentialAccountProblem(error)).toBeUndefined()
  })

  it('returns undefined for a plain (non-AppError) error', () => {
    expect(getPersonCredentialAccountProblem(new Error('plain error'))).toBeUndefined()
  })
})

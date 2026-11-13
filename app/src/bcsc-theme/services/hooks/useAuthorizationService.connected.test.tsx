import { ClientErrorHandlingPolicies } from '@/bcsc-theme/api/clientErrorPolicies'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import BirthdateLockoutScreen from '@/bcsc-theme/features/verify/BirthdateLockoutScreen'
import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import React from 'react'
import { useAuthorizationService } from './useAuthorizationService'

jest.mock('@/bcsc-theme/api/hooks/useApi')

// Real store, rate-limit hook, service and lockout screen; only the API call and navigation are faked
describe('card add rate limit (connected)', () => {
  const endpoint = '/device/code'
  const mockAuthorizeDevice = jest.fn()
  const globalAlert = jest.fn()
  const policyDispatch = jest.fn()
  let service: ReturnType<typeof useAuthorizationService>

  const Harness = () => {
    service = useAuthorizationService()
    return <BirthdateLockoutScreen navigation={{ goBack: jest.fn() } as never} />
  }

  const buildError = () =>
    new AppError(
      'Server returned 503',
      { category: ErrorCategory.NETWORK, appEvent: AppEventCode.ERR_211_SERVER_OUTAGE, statusCode: 2108 },
      {
        cause: new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
          status: 503,
          headers: { 'retry-after': '600' },
        } as never),
        track: false,
      }
    )

  // What BCSCApiClientContext does on a failed call: the first matching policy handles the error
  const runClientPolicy = (error: ReturnType<typeof buildError>) => {
    const context = {
      endpoint,
      apiEndpoints: { deviceAuthorization: endpoint },
      navigation: { dispatch: policyDispatch },
      logger: { info: jest.fn(), warn: jest.fn() },
      alerts: new Proxy({}, { get: () => globalAlert }),
      getResumeRoute: jest.fn(),
    }
    const policy = ClientErrorHandlingPolicies.find((candidate) => candidate.matches(error as never, context as never))
    policy?.handle(error as never, context as never)
    error.handled = true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useApi).mockReturnValue({ authorization: { authorizeDevice: mockAuthorizeDevice } } as never)
  })

  it('records the server wait from a 503 and the lockout screen shows it, without a generic alert', async () => {
    mockAuthorizeDevice.mockImplementation(() => {
      const error = buildError()
      runClientPolicy(error)
      throw error
    })

    const { getByTestId } = render(
      <BasicAppContext>
        <Harness />
      </BasicAppContext>
    )
    const message = () => getByTestId(testIdWithKey(TestIds.verify.birthdateLockout.message)).props.children

    expect(message()).toBe('BCSC.BirthdateLockout.Message')

    await act(async () => {
      await service.authorizeDevice('12345', new Date('1990-01-01')).catch(() => undefined)
    })

    expect(message()).toBe('BCSC.BirthdateLockout.WaitMinutes')
    expect(policyDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'RESET' }))
    expect(globalAlert).not.toHaveBeenCalled()

    // The next attempt is blocked locally: the API is not called again
    await act(async () => {
      await service.authorizeDevice('12345', new Date('1990-01-01')).catch(() => undefined)
    })

    expect(mockAuthorizeDevice).toHaveBeenCalledTimes(1)
  })
})

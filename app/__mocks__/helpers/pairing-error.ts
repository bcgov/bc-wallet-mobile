import { AxiosAppError, ClientErrorHandlingPolicies } from '@/bcsc-theme/api/clientErrorPolicies'
import { formatIasAxiosResponseError, getAppErrorFromAxiosError } from '@/bcsc-theme/utils/axios-error-utils'
import { VERIFY_DEVICE_ASSERTION_PATH } from '@/constants'
import { AxiosError } from 'axios'

/**
 * Takes a 404 from the pairing code assertion endpoint through the same steps as the API client and
 * BCSCApiClientProvider, so a screen test receives the error its catch block would really see.
 *
 * @param data - The response body
 * @param alerts - The alerts available to whichever policy matches
 * @returns The resulting AppError and the policy that matched, if any
 */
export const mockAssertion404 = (data: unknown, alerts: Record<string, jest.Mock> = {}) => {
  const endpoint = `https://example.com/cardtap/${VERIFY_DEVICE_ASSERTION_PATH}`
  const appError = getAppErrorFromAxiosError(
    formatIasAxiosResponseError(
      new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', { url: endpoint } as any, undefined, {
        status: 404,
        data,
      } as any)
    )
  ) as AxiosAppError

  const policy = ClientErrorHandlingPolicies.find((candidate) =>
    candidate.matches(appError, {
      endpoint,
      statusCode: 404,
      apiEndpoints: { cardTap: 'https://example.com/cardtap' } as any,
    })
  )
  policy?.handle(appError, { logger: { info: jest.fn() }, alerts } as any)
  appError.handled = policy !== undefined

  return { appError, policy }
}

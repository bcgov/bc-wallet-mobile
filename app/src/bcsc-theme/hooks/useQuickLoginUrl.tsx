import { AppError, ErrorRegistry } from '@/errors'
import { isAppError, isHandledAppError } from '@/errors/appError'
import { trackFailureSteps } from '@/errors/failureContext'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { TOKENS, useServices } from '@bifold/core'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { createQuickLoginJWT, getAccount } from 'react-native-bcsc-core'
import { ClientMetadata } from '../api/hooks/useMetadataApi'
import { getNotificationTokens } from '../utils/push-notification-tokens'
import { useBCSCApiClient } from './useBCSCApiClient'

// Only a subset of the ClientMetadata is needed for this hook
type ClientMetadataStub = Pick<ClientMetadata, 'client_ref_id' | 'initiate_login_uri'>

// Discriminated union for clearer guarantees
type QuickLoginURLResult =
  | { success: true; url: string }
  | { success: false; error: AppError }
  | { success: false; handled: true }

// Where quick login can fail, reported as `failure_step`
type QuickLoginStep =
  | 'service_config'
  | 'access_token'
  | 'notification_tokens'
  | 'account'
  | 'jwks'
  | 'sign_jwt'
  | 'unexpected'

// Represents a stub service client with an empty client_ref_id
export const STUB_SERVICE_CLIENT: ClientMetadataStub = { client_ref_id: '' }

/**
 * A custom hook to generate a quick login URL for a specific service client
 *
 * Note: This hook returns a callback function which generates the quick login URL
 * this is to prevent stale and expired URLs from being used.
 *
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574688/5.1+System+Interfaces#IAS-Client-Metadata-endpoint
 * @returns {*} {(serviceClient: ClientMetadataStub) => Promise<QuickLoginURLResult>} A function that takes a service client
 * and returns a promise resolving to the quick login URL or an error message.
 */
export const useQuickLoginURL = () => {
  const client = useBCSCApiClient()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const alerts = useAlerts(navigation)

  /**
   * Generates a quick login URL for the given service client.
   *
   * @param {ClientMetadataStub} serviceClient - The service client metadata.
   * @returns {*} {Promise<QuickLoginURLResult>} An object containing the quick login URL or an AppError
   * recording which step failed.
   */
  const getQuickLoginURL = useCallback(
    async (serviceClient: ClientMetadataStub): Promise<QuickLoginURLResult> => {
      const steps = trackFailureSteps<QuickLoginStep>('quick_login', { definition: ErrorRegistry.LOGIN_DEVICE_ERROR })

      try {
        if (!serviceClient.initiate_login_uri) {
          return {
            success: false,
            error: steps.fail('service_config', new Error('Quick login unavailable for this service')),
          }
        }

        const accessToken = client.tokens?.access_token

        if (!accessToken) {
          return { success: false, error: steps.fail('access_token', new Error('No access token available')) }
        }

        // fetchJwkResult never rejects: a failure resolves with jwk null and the reason in error
        const [tokens, account, jwkResult] = await Promise.all([
          steps.run('notification_tokens', () => getNotificationTokens(logger)),
          steps.run('account', () => getAccount()),
          client.fetchJwkResult(),
        ])

        if (!tokens) {
          return {
            success: false,
            error: steps.fail('notification_tokens', new Error('No notification tokens received')),
          }
        }

        if (!account) {
          return { success: false, error: steps.fail('account', new Error('No account data received')) }
        }

        const { jwk } = jwkResult

        if (!jwk) {
          throw steps.fail('jwks', jwkResult.error, { definition: ErrorRegistry.MISSING_JWK_ERROR })
        }

        const loginHint = await steps.run('sign_jwt', () =>
          createQuickLoginJWT(
            accessToken,
            account.clientID,
            account.issuer,
            serviceClient.client_ref_id,
            jwk,
            tokens.fcmDeviceToken,
            tokens.deviceToken
          )
        )

        const encodedTokenHint = encodeURIComponent(loginHint)
        return { success: true, url: `${serviceClient.initiate_login_uri}?login_hint=${encodedTokenHint}` }
      } catch (error) {
        if (isHandledAppError(error)) {
          return { success: false, handled: true }
        }

        if (isAppError(error, AppEventCode.ERR_111_UNABLE_TO_VERIFY_MISSING_JWK)) {
          alerts.missingJwkAlert(error)
          return { success: false, handled: true }
        }

        logger.error('Error creating quick login URL', error as Error)

        // Errors from a step are already handled, anything else is unexpected
        return { success: false, error: steps.fail('unexpected', error) }
      }
    },
    [alerts, client, logger]
  )

  return getQuickLoginURL
}

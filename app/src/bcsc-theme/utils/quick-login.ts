import { createQuickLoginJWT, getAccount, JWK, NativeAccount } from 'react-native-bcsc-core'
import { getNotificationTokens } from './push-notification-tokens'
import BCSCService from '../api/client'

interface QuickLoginUrlConfig {
  /**
   * IAS client reference ID
   *
   * @format uuid
   * @type {string}
   */
  clientRefId: string
  /**
   * JSON Web Key (JWK) used for signing the JWT
   *
   * @type {JWK}
   */
  jwk: JWK
}

/**
 * Creates a quick login hint for the specified configuration.
 *
 * @param {QuickLoginUrlConfig} config - The configuration for creating the quick login hint.
 * @returns {*} {Promise<string>} A promise that resolves to the encoded quick login hint string.
 */
export async function createQuickLoginHint(config: QuickLoginUrlConfig): Promise<string> {
  try {
    const [notificationTokens, account] = await Promise.all([getNotificationTokens(), getAccount()])

    if (!account) {
      throw new Error('No account available')
    }

    // extra safety check, should never happen
    if (!account?.clientID || !account?.issuer) {
      throw new Error('Account information is missing or incomplete')
    }

    if (!BCSCService.tokens?.access_token) {
      throw new Error('Access token is missing')
    }

    const loginHint = await createQuickLoginJWT(
      BCSCService.tokens.access_token,
      account.clientID,
      account.issuer,
      config.clientRefId,
      config.jwk,
      notificationTokens.fcmDeviceToken,
      notificationTokens.apnsToken
    )

    return encodeURIComponent(loginHint)
  } catch (error) {
    throw new Error('QuickLoginHint: Failed to create quick login hint', { cause: error })
  }
}

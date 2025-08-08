import { useCallback, useMemo } from 'react'
import apiClient from '../client'
import { withAccount } from './withAccountGuard'
import { signJWT, getKeyPair, getAllKeys, encryptJWTWithPublicKey } from 'react-native-bcsc-core'

export interface VerifyInPersonResponseData {
  device_code: string
  user_code: string
  verified_email: string
  expires_in: number
}

const useAuthorizationApi = () => {
  // TODO: fetch evidence API endpoint from this endpoint
  const authorizeDevice = useCallback(async (serial: string, birthdate: Date): Promise<VerifyInPersonResponseData> => {
    return withAccount<VerifyInPersonResponseData>(async (account) => {

      const body = {
        response_type: 'device_code',
        client_id: account.clientID,
        card_serial_number: serial || undefined,
        birth_date: birthdate?.toISOString().split('T')[0],
        scope: 'openid profile address offline_access',
        // optionally take id_token_hint - first sign, then encrypt
        id_token_hint: id_token_hint ? await (async () => {
          // Step 1: Sign the JWT
          const signedJWT = await signJWT({
            aud: 'https://idsit.gov.bc.ca/device/',
            sub: account.clientID,
            birthdate: birthdate?.toISOString().split('T')[0],
            issuer: 'https://idsit.gov.bc.ca/device/',
            iss: account.clientID,
            iat: Math.floor(Date.now() / 1000), // issued at time
            exp: Math.floor(Date.now() / 1000) + (10 * 60), // 10 minutes from now, this can be 60 minutes in test
            family_name: 'SURNAMESON', // should come from user data
            ...id_token_hint
          });
          

          const allKeys = await getAllKeys();
          if (!allKeys || allKeys.length === 0) {
            throw new Error('No keys available for JWT encryption');
          }

          // Use the first (current) key
          const currentKey = allKeys[0];
          const keyPair = await getKeyPair(currentKey.id);
          if (!keyPair?.public) {
            throw new Error('No public key available for JWT encryption');
          }
          
          // TODO: encrypt using the key
          // it is a string here
          
          // return await encryptJWTWithPublicKey(signedJWT, publicKeyJWK);
          return signedJWT
        })() : undefined,
      }
      
      apiClient.logger.info(`Registration body: ${JSON.stringify(body, null, 2)}`)
      const { data } = await apiClient.post<VerifyInPersonResponseData>(apiClient.endpoints.deviceAuthorization, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        skipBearerAuth: true,
      })
      return data
    })
  }, [])

  return useMemo(
    () => ({
      authorizeDevice,
    }),
    [authorizeDevice]
  )
}

export default useAuthorizationApi

import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { useCallback, useMemo } from 'react'
import BCSCApiClient from '../client'

export interface JWK {
  kty: string
  e: string
  kid: string
  alg: string
  n: string
}
export type Keys = JWK[]

export type JWKResponseData = {
  keys: Keys
}

const useJwksApi = (apiClient: BCSCApiClient) => {
  const getJwks = useCallback(async (): Promise<Keys> => {
    const {
      data: { keys },
    } = await apiClient.get<JWKResponseData>(apiClient.endpoints.jwksURI, {
      skipBearerAuth: true, // this endpoint does not require an access token
    })
    return keys
  }, [apiClient])

  const getFirstJwk = useCallback(async (): Promise<JWK> => {
    const keys = await getJwks()
    if (keys.length === 0) {
      throw AppError.fromErrorDefinition(ErrorRegistry.MISSING_JWK_ERROR)
    }
    return keys[0]
  }, [getJwks])

  return useMemo(
    () => ({
      getJwks,
      getFirstJwk,
    }),
    [getJwks, getFirstJwk]
  )
}

export default useJwksApi

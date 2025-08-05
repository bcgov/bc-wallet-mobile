import { useCallback, useMemo } from 'react'
import apiClient from '../client'

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

const useJwksApi = () => {
  const getJwks = useCallback(async (): Promise<Keys> => {
    const {
      data: { keys },
    } = await apiClient.get<JWKResponseData>(apiClient.endpoints.jwksURI)
    return keys
  }, [])

  const getFirstJwk = useCallback(async (): Promise<JWK | null> => {
    const keys = await getJwks()
    return keys.length > 0 ? keys[0] : null
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

import { ProvinceCode } from '@/bcsc-theme/utils/address-utils'
import { isAxiosError } from 'axios'
import { useCallback, useMemo } from 'react'
import { createDeviceSignedJWT } from 'react-native-bcsc-core'
import BCSCApiClient from '../client'
import { withAccount } from './withAccountGuard'
import { BCSCCardProcess } from '@/bcsc-theme/types/cards'

const INVALID_REGISTRATION_REQUEST = 'invalid_registration_request'

export interface VerifyInPersonResponseData {
  process: BCSCCardProcess
  user_code: string
  device_code: string
  verified_email: string
  expires_in: number
}

export interface VerifyUnknownBCSCResponseData {
  process: BCSCCardProcess.NonBCSC
  user_code: string
  evidence_upload_uri: string
  device_code: string
  verification_options: string
  verification_uri: string
  expires_in: number
}

export interface AuthorizeDeviceUnknownBCSCConfig {
  firstName: string
  lastName: string
  birthdate: string
  address: {
    streetAddress: string
    postalCode: string
    city: string
    province: ProvinceCode
  }
  gender?: 'male' | 'female' | 'unknown'
  middleNames?: string // space delimited names
}

const useAuthorizationApi = (apiClient: BCSCApiClient) => {
  /**
   * Authorize a device with a known BCSC card.
   *
   * TODO: fetch evidence API endpoint from this endpoint
   *
   * @see `https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301615517/5.1.1+Evidence+API`
   * @param {string} serial - BCSC serial number
   * @param {Date} birthdate - Users birth date
   * @returns {*} {VerifyInPersonResponseData | null}
   */
  const authorizeDevice = useCallback(
    async (serial: string, birthdate: Date): Promise<VerifyInPersonResponseData | null> => {
      return withAccount<VerifyInPersonResponseData | null>(async (account) => {
        const body = {
          response_type: 'device_code',
          client_id: account.clientID,
          card_serial_number: serial,
          birth_date: birthdate.toISOString().split('T')[0],
          scope: 'openid profile address offline_access',
        }

        apiClient.logger.info('useAuthorizationApi.authorizeDevice.body', body)

        try {
          const { data } = await apiClient.post<VerifyInPersonResponseData>(
            apiClient.endpoints.deviceAuthorization,
            body,
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              skipBearerAuth: true,
            }
          )

          return data
        } catch (error) {
          /**
           * if already registered, return null for workflow convienience
           * useful to be able to determine if the request failed or if the device
           * has previously been registered
           */
          if (isDeviceRegistered(error)) {
            return null
          }

          throw error
        }
      })
    },
    [apiClient]
  )

  /**
   * Authorize a device with an unknown BCSC card.
   *
   * Note: This request will return null if called multiple times for the same device.
   * First response will return the Verification response, which must be stored and persisted.
   *
   * @see `https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301615517/5.1.1+Evidence+API`
   * @param {AuthorizeDeviceUnknownBCSCConfig} config - Config including user information and address
   * @returns {*} {VerifyUnknownBCSCResponseData | null} - Returns the response data or null if already registered
   */
  const authorizeDeviceWithUnknownBCSC = useCallback(
    async (config: AuthorizeDeviceUnknownBCSCConfig): Promise<VerifyUnknownBCSCResponseData | null> => {
      return withAccount<VerifyUnknownBCSCResponseData | null>(async (account) => {
        const body: Record<string, any> = {
          client_id: account.clientID,
          response_type: 'device_code',
          scope: 'openid profile address offline_access',
          id_token_hint: await createDeviceSignedJWT({
            iss: account.clientID,
            aud: account.issuer,
            sub: account.clientID,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 10, // ten minutes
            family_name: config.lastName,
            given_name: config.firstName,
            birthdate: config.birthdate,
            address: {
              street_address: config.address.streetAddress,
              postal_code: config.address.postalCode,
              locality: config.address.city,
              region: config.address.province,
              country: 'CA',
            },
            // IAS requests 'unknown' when not specified
            gender: config.gender ?? 'unknown',
            // Omit middle name if not provided or empty string
            middle_name: config.middleNames || undefined,
          }),
        }

        apiClient.logger.info('useAuthorizationApi.authorizeDeviceWithUnknownBCSC.body', body)

        try {
          const { data } = await apiClient.post<VerifyUnknownBCSCResponseData>(
            apiClient.endpoints.deviceAuthorization,
            body,
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              skipBearerAuth: true,
            }
          )

          return data
        } catch (error) {
          /**
           * if already registered, return null for workflow convienience
           * useful to be able to determine if the request failed or if the device
           * has previously been registered
           */
          if (isDeviceRegistered(error)) {
            return null
          }

          throw error
        }
      })
    },
    [apiClient]
  )

  return useMemo(
    () => ({
      authorizeDevice,
      authorizeDeviceWithUnknownBCSC,
    }),
    [authorizeDevice, authorizeDeviceWithUnknownBCSC]
  )
}

export default useAuthorizationApi

// Helper functions

/**
 * Checks if an error matches the structure of when a device is registered.
 *
 * @param {any} error - The error to check
 * @returns {*} {boolean}
 */
function isDeviceRegistered(error: any): boolean {
  return (
    isAxiosError(error) &&
    error.response?.status === 400 &&
    error.response?.data.error === INVALID_REGISTRATION_REQUEST &&
    // "client is in invalid statue" OR "client is in invalid state"
    String(error.response?.data.error_description).includes('client is in invalid')
  )
}

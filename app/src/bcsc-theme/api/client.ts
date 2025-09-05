import BCLogger from '@/utils/logger'
import { RemoteLogger } from '@bifold/remote-logs'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { jwtDecode } from 'jwt-decode'
import { getRefreshTokenRequestBody } from 'react-native-bcsc-core'
import Config from 'react-native-config'

import { TokenStatusResponseData } from './hooks/useTokens'
import { withAccount } from './hooks/withAccountGuard'
import { getDeviceCountFromIdToken } from '../utils/get-device-count'

// Extend AxiosRequestConfig to include skipBearerAuth
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipBearerAuth?: boolean
  }
}

export interface TokenStatusResponseDataWithDeviceCount extends TokenStatusResponseData {
  bcsc_devices_count?: number
}

interface BCSCConfig {
  pairDeviceWithQRCodeSupported: boolean
  maximumAccountsPerDevice: number
  allowedIdentificationProcesses: string[]
  credentialFlowsSupported: string
  multipleAccountsSupported: boolean
  attestationTimeToLive: number
}

interface BCSCEndpoints {
  attestation: string
  issuer: string
  authorization: string
  userInfo: string
  deviceAuthorization: string
  jwksURI: string
  registration: string
  clientMetadata: string
  savedServices: string
  token: string
  credential: string
  evidence: string
}

class BCSCService {
  readonly client: AxiosInstance
  readonly logger: RemoteLogger
  endpoints: BCSCEndpoints
  config: BCSCConfig
  baseURL: string
  tokens?: TokenStatusResponseData // this token will be used to interact and access data from IAS servers

  constructor(baseURL: string = String(Config.IAS_URL ?? 'https://idsit.gov.bc.ca')) {
    this.baseURL = baseURL
    this.logger = BCLogger
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (this.baseURL) {
      this.logger.info(`BCSCService initialized with URL: ${this.baseURL}`)
    } else {
      this.logger.error('BCSCService initialized with empty URL.')
    }

    // fallback config
    this.config = {
      pairDeviceWithQRCodeSupported: true,
      maximumAccountsPerDevice: 0,
      allowedIdentificationProcesses: [
        'IDIM L3 Remote BCSC Photo Identity Verification',
        'IDIM L3 Remote BCSC Non-Photo Identity Verification',
        'IDIM L3 Remote Non-BCSC Identity Verification',
      ],
      credentialFlowsSupported: 'default_web_flow, bcwallet_initiated, bcsc_initiated',
      multipleAccountsSupported: false,
      attestationTimeToLive: 60,
    }

    // fallback endpoints
    this.endpoints = {
      attestation: `${this.baseURL}/device/attestations`,
      issuer: `${this.baseURL}/device/`,
      authorization: `${this.baseURL}/device/authorize`,
      userInfo: `${this.baseURL}/device/userinfo`,
      deviceAuthorization: `${this.baseURL}/device/devicecode`,
      jwksURI: `${this.baseURL}/device/jwk`,
      registration: `${this.baseURL}/device/register`,
      clientMetadata: `${this.baseURL}/device/clients/metadata`,
      savedServices: `${this.baseURL}/device/services`,
      token: `${this.baseURL}/device/token`,
      credential: `${this.baseURL}/credentials/v1/person`,
      evidence: `${this.baseURL}/evidence`,
    }

    // Add interceptors
    this.client.interceptors.request.use(this.handleRequest.bind(this))
    this.client.interceptors.response.use(undefined, (error: AxiosError) => {
      const errorDetails = {
        name: error.name,
        message: error.message,
        code: error.code,

        request: {
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          headers: error.config?.headers,
          data: error.config?.data,
          params: error.config?.params,
        },

        response: error.response
          ? {
              status: error.response.status,
              statusText: error.response.statusText,
              headers: error.response.headers,
              data: error.response.data,
            }
          : null,

        isTimeout: error.code === 'ECONNABORTED',
        isNetworkError: !error.response && !error.code,

        stack: error.stack,
      }

      this.logger.error(`API Error:\n${JSON.stringify(errorDetails, null, 2)}`)

      return Promise.reject(error)
    })
  }

  async fetchEndpointsAndConfig(url: string) {
    const response = await this.get<any>(`${url}/device/.well-known/openid-configuration`, { skipBearerAuth: true })
    this.config = {
      pairDeviceWithQRCodeSupported: response.data['pair_device_with_qrcode_supported'],
      maximumAccountsPerDevice: response.data['maximum_accounts_per_device'],
      allowedIdentificationProcesses: response.data['allowed_identification_processes'],
      credentialFlowsSupported: response.data['credential_flows_supported'],
      multipleAccountsSupported: response.data['multiple_accounts_supported'],
      attestationTimeToLive: response.data['attestation_time_to_live'],
    }

    this.endpoints = {
      attestation: response.data['attestation_endpoint'],
      issuer: response.data['issuer'],
      authorization: response.data['authorization_endpoint'],
      userInfo: response.data['userinfo_endpoint'],
      deviceAuthorization: response.data['device_authorization_endpoint'],
      jwksURI: response.data['jwks_uri'],
      registration: response.data['registration_endpoint'],
      clientMetadata: response.data['client_metadata_endpoint'],
      savedServices: response.data['saved_services_endpoint'],
      token: response.data['token_endpoint'],
      credential: response.data['credential_endpoint'],
      // TODO(bm): request backend team to add evidence endpoint to the response
      evidence: `${this.baseURL}/evidence`,
    }
  }

  async fetchAccessToken(): Promise<TokenStatusResponseDataWithDeviceCount> {
    return withAccount(async () => {
      if (!this.tokens?.refresh_token || this.isTokenExpired(this.tokens?.refresh_token)) {
        // refresh token should be saved when a device is authorized with IAS
        throw new Error('TODO: Register if refresh token is expired or not present')
      }

      const tokenData = await this.getTokensForRefreshToken(this.tokens.refresh_token)
      return tokenData
    })
  }

  private isTokenExpired(token?: string): boolean {
    let isExpired = true
    // if no token is present, return that token is "expired" and fetch a new one
    if (token) {
      const decodedToken = jwtDecode(token)
      const exp = decodedToken.exp ?? 0
      isExpired = Date.now() >= exp * 1000
    }
    return isExpired
  }

  private async handleRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    // skip processing if skipBearerAuth is set in the config
    if (config.skipBearerAuth) {
      return config
    }

    if (!this.tokens || this.isTokenExpired(this.tokens.access_token)) {
      this.tokens = await this.fetchAccessToken()
    }

    if (this.tokens) {
      config.headers.set('Authorization', `Bearer ${this.tokens.access_token}`)
    }

    this.logger.debug(`${String(config.method)}: ${String(config.url)}`, {})
    return config
  }

  async getTokensForRefreshToken(refreshToken: string): Promise<TokenStatusResponseDataWithDeviceCount> {
    return withAccount(async (account) => {
      const { issuer, clientID } = account
      const tokenBody = await getRefreshTokenRequestBody(issuer, clientID, refreshToken)
      const tokenResponse = await this.post<TokenStatusResponseData>(this.endpoints.token, tokenBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        skipBearerAuth: true,
      })
      this.tokens = tokenResponse.data

      const bcsc_devices_count = await getDeviceCountFromIdToken(tokenResponse.data.id_token, this.logger)

      return { ...tokenResponse.data, bcsc_devices_count }
    })
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config)
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config)
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config)
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config)
  }
}

const client = new BCSCService()

export default client

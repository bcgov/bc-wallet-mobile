import { RemoteLogger } from '@bifold/remote-logs'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { jwtDecode } from 'jwt-decode'
import { getRefreshTokenRequestBody } from 'react-native-bcsc-core'
import { formatAxiosErrorForLogger, formatIasAxiosResponseError } from '../utils/error-utils'
import { TokenResponse } from './hooks/useTokens'
import { withAccount } from './hooks/withAccountGuard'

// Extend AxiosRequestConfig to include skipBearerAuth
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipBearerAuth?: boolean
    // Note: Useful for endpoints that return expected error codes
    suppressStatusCodeLogs?: number[]
  }
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
  video: string
  cardTap: string
  barcodes: string
  accountDevices: string
  account: string
}

class BCSCApiClient {
  readonly client: AxiosInstance
  readonly logger: RemoteLogger
  endpoints: BCSCEndpoints
  config: BCSCConfig
  baseURL: string
  tokens?: TokenResponse // this token will be used to interact and access data from IAS servers
  tokensPromise: Promise<TokenResponse> | null // to prevent multiple simultaneous token fetches

  constructor(baseURL: string, logger: RemoteLogger) {
    this.baseURL = baseURL
    this.logger = logger
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (this.baseURL) {
      this.logger.info(`BCSCApiClient initialized with URL: ${this.baseURL}`)
    } else {
      this.logger.error('BCSCApiClient initialized with empty URL.')
    }

    this.tokensPromise = null

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
      video: `${this.baseURL}/video`,
      cardTap: `${this.baseURL}/cardtap`,
      barcodes: `${this.baseURL}/device/barcodes`,
      accountDevices: `${this.baseURL}/account/embedded/devices`,
      account: `${this.baseURL}/account`,
    }

    // Add interceptors
    this.client.interceptors.request.use(this.handleRequest.bind(this))
    this.client.interceptors.response.use(undefined, (error: AxiosError) => {
      const IASAxiosError = formatIasAxiosResponseError(error)

      const loggerError = formatAxiosErrorForLogger({
        error: IASAxiosError,
        suppressStackTrace: __DEV__, // disable stack trace in development
      })

      const suppressStatusCodeLogs = error.config?.suppressStatusCodeLogs ?? []
      const statusCode = error.response?.status ?? 0

      // Only log if the status code is not in the suppress list
      if (!suppressStatusCodeLogs.includes(statusCode)) {
        this.logger.error('IAS API Error', loggerError)
      }

      return Promise.reject(IASAxiosError)
    })
  }

  async fetchEndpointsAndConfig() {
    const response = await this.get<any>(`${this.baseURL}/device/.well-known/openid-configuration`, {
      skipBearerAuth: true,
    })

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
      evidence: response.data['evidence_endpoint'],
      video: response.data['video_call_endpoint'],
      cardTap: response.data['cardtap_endpoint'],
      barcodes: response.data['barcodes_endpoint'],
      accountDevices: response.data['account_devices_endpoint'],
      account: response.data['account_endpoint'],
    }
  }

  private async ensureValidTokens(): Promise<TokenResponse> {
    return withAccount(async () => {
      if (this.tokensPromise) {
        // return the existing promise if currently refreshing
        return this.tokensPromise
      }

      if (!this.tokens) {
        // initialize tokens using `getTokensForRefreshToken`
        this.logger.error('BCSCClient: Missing tokens - call getTokensForRefreshToken to initialize tokens')
        throw new Error('Client missing tokens')
      }

      if (this.isTokenExpired(this.tokens.refresh_token)) {
        // refresh tokens should not expire
        this.logger.error('BCSCClient: Refresh token expired - fatal error detected')
        throw new Error('Refresh token expired')
      }

      if (!this.isTokenExpired(this.tokens.access_token)) {
        // access token is still valid, don't refresh
        return this.tokens
      }

      // access token is expired, fetch new tokens using refresh token
      return this.getTokensForRefreshToken(this.tokens.refresh_token)
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
    this.logger.info(`[${config.method?.toUpperCase()}] ${String(config.url)}`)

    // skip processing if skipBearerAuth is set in the config
    if (config.skipBearerAuth) {
      return config
    }

    const tokens = await this.ensureValidTokens()
    config.headers.set('Authorization', `Bearer ${tokens.access_token}`)

    return config
  }

  private fetchTokens(refreshToken: string): Promise<TokenResponse> {
    return withAccount(async (account) => {
      const tokenBody = await getRefreshTokenRequestBody(account.issuer, account.clientID, refreshToken)

      const tokensResponse = await this.post<TokenResponse>(this.endpoints.token, tokenBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        skipBearerAuth: true,
      })

      return tokensResponse.data
    })
  }

  async getTokensForRefreshToken(refreshToken: string): Promise<TokenResponse> {
    if (this.tokensPromise) {
      // Return the existing promise if currently refreshing
      return this.tokensPromise
    }

    try {
      this.tokensPromise = this.fetchTokens(refreshToken)
      this.tokens = await this.tokensPromise
    } finally {
      // Clear the promise cache regardless of success or failure
      this.tokensPromise = null
    }

    return this.tokens
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

export default BCSCApiClient

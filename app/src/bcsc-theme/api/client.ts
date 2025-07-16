import BCLogger from '@/utils/logger'
import { RemoteLogger } from '@bifold/remote-logs'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { jwtDecode } from 'jwt-decode'
import { getRefreshTokenRequestBody } from 'react-native-bcsc-core'
import Config from 'react-native-config'

import { TokenStatusResponseData } from './hooks/useTokens'
import { withAccount } from './hooks/withAccountGuard'

interface BCSCEndpoints {
  // METADATA
  pairDeviceWithQRCodeSupported: boolean
  maximumAccountsPerDevice: number
  allowedIdentificationProcesses: string[]
  credentialFlowsSupported: string
  multipleAccountsSupported: false
  attestationTimeToLive: number

  // ENDPOINTS
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
  baseURL: string
  tokens?: TokenStatusResponseData // this token will be used to interact and access data from IAS servers

  constructor(baseURL: string = String(Config.IAS_URL)) {
    this.baseURL = baseURL
    this.logger = BCLogger
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Default test environment for endpoints
    this.endpoints = {
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
      attestation: 'https://idsit.gov.bc.ca/device/attestations',
      issuer: 'https://idsit.gov.bc.ca/device/',
      authorization: 'https://idsit.gov.bc.ca/device/authorize',
      userInfo: 'https://idsit.gov.bc.ca/device/userinfo',
      deviceAuthorization: 'https://idsit.gov.bc.ca/device/devicecode',
      jwksURI: 'https://idsit.gov.bc.ca/device/jwk',
      registration: 'https://idsit.gov.bc.ca/device/register',
      clientMetadata: 'https://idsit.gov.bc.ca/device/clients/metadata',
      savedServices: 'https://idsit.gov.bc.ca/device/services',
      token: 'https://idsit.gov.bc.ca/device/token',
      credential: 'https://idsit.gov.bc.ca/credentials/v1/person',
      evidence: 'https://idsit.gov.bc.ca/evidence',
    }

    // Add interceptors
    this.client.interceptors.request.use(this.handleRequest.bind(this))
    this.client.interceptors.response.use(undefined, (error: AxiosError) => {
      this.logger.error(`${error.name}: ${error.code}`, { message: `IAS API Error: ${error.message}`, error: error.response?.data })
      return Promise.reject(error)
    })
  }

  async fetchEndpoints(url: string) {
    const response = await this.get<any>(`${url}/device/.well-known/openid-configuration`)
    this.endpoints = {
      pairDeviceWithQRCodeSupported: response.data['pair_device_with_qrcode_supported'],
      maximumAccountsPerDevice: response.data['maximum_accounts_per_device'],
      allowedIdentificationProcesses: response.data['allowed_identification_processes'],
      credentialFlowsSupported: response.data['credential_flows_supported'],
      multipleAccountsSupported: response.data['multiple_accounts_supported'],
      attestationTimeToLive: response.data['attestation_time_to_live'],

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
      evidence: 'https://idsit.gov.bc.ca/evidence', // this comes from /device/devicecode if an evidence flag is provided to that call
    }
  }

  async fetchAccessToken(): Promise<TokenStatusResponseData> {
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
    // skip processing if request is made to token or endpoint URL or initial registration
    if (
      config.url?.endsWith('/device/.well-known/openid-configuration') || // this endpoint is open
      config.url?.endsWith('/device/token') || // this endpoint does not require an access token to fetch a token
      config.url?.endsWith('/device/register') || // this endpoint registers the user and grants an access token 
      config.url?.endsWith('/device/devicecode') || // this endpoint registers the device before an access token is granted
      config.url?.includes('/evidence') // the evidence endpoints are used to verify a user, so the user will not have an access token yet
    ) {
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

  async getTokensForRefreshToken(refreshToken: string): Promise<TokenStatusResponseData> {
    return withAccount(async (account) => {
      const { issuer, clientID } = account
      const tokenBody = await getRefreshTokenRequestBody(issuer, clientID, refreshToken)
      const tokenResponse = await this.post<TokenStatusResponseData>(this.endpoints.token, tokenBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      this.tokens = tokenResponse.data
      return tokenResponse.data
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
client.fetchEndpoints(client.baseURL).catch((error) => {
  client.logger.error('Failed to fetch BCSC endpoints', {
    message: error instanceof Error ? error.message : String(error),
  })
})

export default client

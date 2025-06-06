import BCLogger from '@/utils/logger'
import { RemoteLogger } from '@bifold/remote-logs'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { jwtDecode } from 'jwt-decode'
import { getRefreshTokenRequestBody } from 'react-native-bcsc-core'
import Config from 'react-native-config'

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
}

interface AccessToken {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  scope: string
  token_type: string
}

class BCSCService {
  readonly client: AxiosInstance
  readonly logger: RemoteLogger
  endpoints: BCSCEndpoints
  baseURL: string
  accessToken?: AccessToken // this token will be used to interact and access data from IAS servers
  refreshToken?: string // this is used to refresh access tokens, it is long lived, it might be worth putting in storage

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
    }

    // Add interceptors
    this.client.interceptors.request.use(this.handleRequest.bind(this))
    this.client.interceptors.response.use(undefined, (error: any) => {
      this.logger.error(`${error.name}: ${error.code}`, { message: `IAS API Error: ${error.message}` })
      return Promise.reject(error)
    })

    // fetch endpoints
    this.fetchEndpoints(baseURL)
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
    }
  }

  async fetchAccessToken(): Promise<AccessToken> {
    const tokenBody = await getRefreshTokenRequestBody()
    const tokenResponse = await this.post<AccessToken>(this.endpoints.token, tokenBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    return tokenResponse.data
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
    // skip processing if request is made to token or endpoint URL
    if (config.url?.endsWith('/device/.well-known/openid-configuration') || config.url?.endsWith('/device/token')) {
      return config
    }

    if (!this.accessToken || this.isTokenExpired(this.accessToken.access_token)) {
      this.accessToken = await this.fetchAccessToken()
    }

    if (this.accessToken) {
      config.headers.set('Authorization', `Bearer ${this.accessToken.access_token}`)
    }
    this.logger.debug(`${String(config.method)}: ${String(config.url)}`, {})
    return config
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

export default new BCSCService()

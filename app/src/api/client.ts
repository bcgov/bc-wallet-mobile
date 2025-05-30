import { BifoldError, BifoldLogger } from '@bifold/core'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import Config from 'react-native-config'

interface BCSCEndpoints {
  // METADATA
  pairDeviceWithQRCodeSupported: boolean
  maximumAccountsPerDevice: number
  allowedIdentificationProcesses: string[]
  credentialFlowsSupported: string
  multipleAccountsSupported: number
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

class BCSCService {
  readonly client: AxiosInstance
  readonly logger: BifoldLogger
  endpoints?: BCSCEndpoints
  accessToken?: string // this token will be used to interact with IAS servers
  refreshToken?: string // this is used to refresh access tokens, is long lived and should be

  // https://iddev.gov.bc.ca/device/.well-known/openid-configuration
  constructor(baseURL: string = String(Config.IAS_URL)) {
    // this might need to fetch the endpoints from a service to feed into each function?
    // similar to bcsc, it fetches all endpoints from another services and each function knows the key they need to access the endpoint it's hitting
    this.logger = new BifoldLogger()
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add interceptors
    this.client.interceptors.request.use(this.handleRequest.bind(this))
    this.client.interceptors.response.use(undefined, (error: BifoldError) => {
      this.logger.error(error.message, { message: 'IAS API Error' })
    })

    // fetch endpoints
    this.fetchEndpoints()
  }

  async fetchEndpoints() {
    const response = await this.get<any>('/device/.well-known/openid-configuration')
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

  buildToken(): string | null {
    // REFRESH TOKEN
    // This will need to be persisted in the store to allow users roll back
    // getKeys (jason module)
    // fetch latest ID from keys
    // jose.generateKeyPair
    // sign the token
    // return the token

    return null
  }

  // Handle request interception
  private handleRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const token = this.buildToken()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    this.logger.debug(`${String(config.method)}: ${String(config.url)}`, { message: 'Buttons' })
    return config
  }

  // Handle errors globally
  // this will probably need to be handled within the context of react for dispatching error events or updating UI
  // doesn't make sense to keep this here
  private handleError(error: Error): Promise<any> {
    // Log or handle errors here
    return Promise.reject(error)
  }

  // Example methods for API calls
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

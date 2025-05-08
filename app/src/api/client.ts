import { BifoldError, BifoldLogger } from '@bifold/core'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import Config from 'react-native-config'

class ApiClient {
  readonly client: AxiosInstance
  readonly logger: BifoldLogger

  constructor(baseURL: string = String(Config.IAS_URL)) {
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
  }

  buildToken(): string | null {
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

export default new ApiClient()

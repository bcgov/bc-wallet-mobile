import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import Config from 'react-native-config'

class ApiClient {
  private client: AxiosInstance
  private authToken: string | null = null

  constructor(baseURL: string = String(Config.IAS_URL)) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add interceptors
    this.client.interceptors.request.use(this.handleRequest.bind(this))
  }

  // Set the authentication token
  setAuthToken(token: string) {
    this.authToken = token
  }

  buildToken() {
    // getKeys (jason module)
    // fetch latest ID from keys
    // jose.generateKeyPair
    // sign the token
    // return the token
  }

  // Clear the authentication token
  clearAuthToken() {
    this.authToken = null
  }

  // Handle request interception
  private handleRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if (this.authToken) {
      config.headers.set('Authorization', `Bearer ${this.authToken}`)
    }
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

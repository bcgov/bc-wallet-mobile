import axios from 'axios'
import Config from 'react-native-config'

const apiClient = axios.create({
  baseURL: Config.IAS_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add a request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // add auth headers to request
    // const token = 'your-auth-token';
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config
  },
  (error: Error) => {
    return Promise.reject(error)
  }
)

export default apiClient

/*
  1. use module to fetch device keys
  2. find device key that is the correct ID
  3. Use Jose to generate keys with that ID
  4. Use Jose to generate a JWT with the keys
  5. Send authenticated requests to the protected server routes
*/

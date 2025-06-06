import apiClient from '../client'
import { Platform } from 'react-native'

export interface ServerStatusResponseData{  
  "minVersion": string,
  "minVersionMessage": string,
  "supportedVersions": string[],
  "service": string,
  "status": string,
  "statusMessage": string,
  "contactLink": string,
  "controlNumber" : number
}

export interface TermsOfUseResponseData {
  "version": string,
  "date": string,
  "html": string
}

const usePairingApi = () => {
  const getServerStatus = async () => {
    // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
    const { data } = await apiClient.get<ServerStatusResponseData>(`${apiClient.baseURL}/cardtap/v3/status/${Platform.OS}/mobile_card`)
    return data
  }

  const getTermsOfUse = async () => {
    // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
    const { data } = await apiClient.get<TermsOfUseResponseData>(`${apiClient.baseURL}/cardtap/v3/terms`)
    return data
  }

  return {
    getServerStatus,
    getTermsOfUse,
  }
}

export default usePairingApi
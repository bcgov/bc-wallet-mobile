import { Platform } from 'react-native'
import apiClient from '../client'
import { signPairingCode } from 'react-native-bcsc-core'


export async function getServerStatus() {
  let device = 'android'
  if (Platform.OS === 'ios') {
    device = 'ios'
  }
  // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
  return apiClient.get(`${apiClient.baseURL}/cardtap/v3/status/${device}/mobile_card`)
}

export async function getTermsOfUse() {
  // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
  return apiClient.get(`${apiClient.baseURL}/cardtap/v3/terms`)
}

export async function loginByPairingCode(code: string) {
  const signedCode = await signPairingCode(code)
  try {
    // this endpoint is not available through the .well-known/openid-configuration so it needs to be hardcoded
    await apiClient.post(`${apiClient.baseURL}/cardtap/v3/mobile/assertion`, { assertion: signedCode }, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
    return { success: true }
  } catch (error: any) {
    return { success: false }
  }
} 
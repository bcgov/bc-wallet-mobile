import { Platform } from 'react-native'
import apiClient from '../client'
import { signPairingCode } from 'react-native-bcsc-core'

export async function getServerStatus() {
  let device = 'android'
  if (Platform.OS === 'ios') {
    device = 'ios'
  }

  return apiClient.get(`/cardtap/v3/status/${device}/mobile_card`)
}

export async function getTermsOfUse() {
  return apiClient.get('/cardtap/v3/terms')
}

export async function loginByPairingCode(code: string) {
  const signedCode = await signPairingCode(code)
  try {
    await apiClient.post('/cardtap/v3/mobile/assertion', { assertion: signedCode }, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
    return { success: true }
  } catch (error) {
    return { success: false }
  }
} 
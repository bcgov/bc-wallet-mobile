import { Platform } from 'react-native'
import apiClient from '../client'

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
  /*
    code needs to be signed and will come from the bcsc core package
    access token will be added on to teh request pre flight
  */
  return apiClient.post('/cardtap/v3/mobile/assertion', { assertion: code }, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
}
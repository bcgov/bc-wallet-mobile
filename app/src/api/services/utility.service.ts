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

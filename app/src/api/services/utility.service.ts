import apiClient from '../client'

export async function getServerStatus(device: 'ios' | 'android') {
  // these services should transform the data slightly before pushing it to the front end
  return apiClient.get(`/cardtap/v3/status/${device}/mobile_card`)
}

export async function getTermsOfUse() {
  return apiClient.get('/cardtap/v3/terms')
}

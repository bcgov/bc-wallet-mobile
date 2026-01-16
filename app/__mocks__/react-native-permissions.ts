const check = jest.fn()
const request = jest.fn().mockResolvedValue('not-granted')
const openSettings = jest.fn().mockResolvedValue(undefined)

const PERMISSIONS = {
  ANDROID: {
    POST_NOTIFICATIONS: 'POST_NOTIFICATIONS',
  },
}

const RESULTS = {
  GRANTED: 'granted',
}

export { PERMISSIONS, RESULTS, check, request, openSettings }

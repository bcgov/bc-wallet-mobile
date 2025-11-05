const check = jest.fn()
const request = jest.fn().mockResolvedValue('not-granted')

const PERMISSIONS = {
  ANDROID: {
    POST_NOTIFICATIONS: 'POST_NOTIFICATIONS',
  },
}

const RESULTS = {
  GRANTED: 'granted',
}

export { PERMISSIONS, RESULTS, check, request }

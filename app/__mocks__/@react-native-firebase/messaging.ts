const messaging = Object.assign(
  jest.fn().mockReturnValue({
    setBackgroundMessageHandler: jest.fn(),
    onMessage: jest.fn(),
    requestPermission: jest.fn(),
    hasPermission: jest.fn().mockResolvedValue(1), // 1 = authorized
    getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  }),
  {
    // Static property accessed as messaging.AuthorizationStatus
    AuthorizationStatus: {
      NOT_DETERMINED: -1,
      DENIED: 0,
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    },
  }
)

export default messaging

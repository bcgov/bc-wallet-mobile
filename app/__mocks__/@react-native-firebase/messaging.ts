const messaging = jest.fn().mockReturnValue({
  setBackgroundMessageHandler: jest.fn(),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  requestPermission: jest.fn(),
})

export default messaging

const messaging = jest.fn().mockReturnValue({
  setBackgroundMessageHandler: jest.fn(),
  onMessage: jest.fn(),
  requestPermission: jest.fn(),
})

export default messaging

// Mock for react-native-screenguard
const ScreenGuardModule = {
  register: jest.fn(),
  unregister: jest.fn(),
  registerScreenRecording: jest.fn(),
  unregisterScreenRecording: jest.fn(),
  enableBlurScreen: jest.fn(),
  disableBlurScreen: jest.fn(),
  addListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  removeListeners: jest.fn(),
}

export default ScreenGuardModule

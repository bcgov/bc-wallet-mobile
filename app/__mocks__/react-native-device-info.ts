// The package mock is a CJS module — ESM import causes hoisting issues in Jest.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const diMock = require('react-native-device-info/jest/react-native-device-info-mock')

diMock.getApplicationName = jest.fn(() => 'BCServicesCard')
diMock.getVersion = jest.fn(() => '4.0.0')
diMock.getBuildNumber = jest.fn(() => '142')
diMock.getSystemName = jest.fn(() => 'iOS')
diMock.getSystemVersion = jest.fn(() => '17.4')

module.exports = diMock

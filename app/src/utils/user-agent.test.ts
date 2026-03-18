import { getUserAgentString } from './user-agent'

jest.mock('react-native-device-info', () => ({
  getApplicationName: () => 'BC Services Card',
  getVersion: () => '2.1.0',
  getBuildNumber: () => '142',
  getSystemName: () => 'iOS',
  getSystemVersion: () => '17.4',
}))

describe('getUserAgentString', () => {
  it('returns a formatted user-agent string', () => {
    expect(getUserAgentString()).toBe('BCServicesCard/2.1.0 (iOS 17.4; Build 142)')
  })
})

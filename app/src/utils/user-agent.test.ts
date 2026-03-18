import { getUserAgentString } from './user-agent'

describe('getUserAgentString', () => {
  it('returns a formatted user-agent string', () => {
    expect(getUserAgentString()).toBe('BCServicesCard/2.1.0 (iOS 17.4; Build 142)')
  })
})

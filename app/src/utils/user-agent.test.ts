import { getUserAgentString } from './user-agent'

describe('getUserAgentString', () => {
  it('returns a formatted user-agent string', () => {
    expect(getUserAgentString()).toBe('BCServicesCard/4.0.0 (iOS 17.4; Build 142)')
  })
})

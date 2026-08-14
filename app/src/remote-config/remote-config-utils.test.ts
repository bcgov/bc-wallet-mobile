import { getBundledRemoteConfig } from './remote-config-utils'

describe('Remote Config Utils', () => {
  describe('getBundledRemoteConfig', () => {
    it('should return the bundled remote config', () => {
      expect(getBundledRemoteConfig()).toBeDefined()
    })
  })
})

import { getBundledRemoteConfig, RemoteConfigSchema } from './remote-config-utils'

describe('Remote Config Utils', () => {
  describe('getBundledRemoteConfig', () => {
    it('should return the bundled remote config', () => {
      expect(getBundledRemoteConfig()).toBeDefined()
    })
  })

  describe('RemoteConfigSchema', () => {
    it('should validate the bundled remote config', () => {
      expect(RemoteConfigSchema.parse(getBundledRemoteConfig())).toBeDefined()
    })
  })
})

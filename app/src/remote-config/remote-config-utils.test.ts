import * as Bifold from '@bifold/core'
import axios from 'axios'
import {
  fetchRemoteConfig,
  getBundledRemoteConfig,
  getCachedRemoteConfig,
  RemoteConfigSchema,
} from './remote-config-utils'

const MOCK_REMOTE_CONFIG = {
  featureFlags: {
    'debug.testFeature': true,
  },
}

describe('Remote Config Utils', () => {
  describe('getBundledRemoteConfig', () => {
    it('should return the bundled remote config', () => {
      expect(getBundledRemoteConfig()).toBeDefined()
    })
  })

  describe('getCachedRemoteConfig', () => {
    it('should return null if fetching cached remote config fails', async () => {
      const mockLogger: any = { error: jest.fn(), info: jest.fn() }
      const mockError = new Error()
      jest.spyOn(Bifold.PersistentStorage, 'fetchValueForKey').mockRejectedValue(mockError)

      const cachedConfig = await getCachedRemoteConfig(mockLogger)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ error: mockError }))
      expect(cachedConfig).toBeNull()
    })

    it('should return null if no cached remote config is found', async () => {
      const mockLogger: any = { error: jest.fn(), info: jest.fn() }
      jest.spyOn(Bifold.PersistentStorage, 'fetchValueForKey').mockResolvedValue(undefined)

      const cachedConfig = await getCachedRemoteConfig(mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('No cached'))
      expect(cachedConfig).toBeNull()
    })

    it('should return null if cached remote config is expired', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01'))

      const mockLogger: any = { error: jest.fn(), info: jest.fn() }
      const oneDay = 24 * 60 * 60 * 1000

      jest.spyOn(Bifold.PersistentStorage, 'fetchValueForKey').mockResolvedValue({
        remoteConfig: {},
        timestamp: Date.now() - oneDay - 1, // 1 ms past the expiration time
      })

      const cachedConfig = await getCachedRemoteConfig(mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('expired'))
      expect(cachedConfig).toBeNull()

      jest.useRealTimers()
    })

    it('should return null if the cached remote config is invalid', async () => {
      const mockLogger: any = { error: jest.fn(), info: jest.fn() }
      const invalidRemoteConfig = { invalidKey: 'invalidValue' }

      jest.spyOn(Bifold.PersistentStorage, 'fetchValueForKey').mockResolvedValue({
        remoteConfig: invalidRemoteConfig,
        timestamp: Date.now(),
      })

      const cachedConfig = await getCachedRemoteConfig(mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('invalid'),
        expect.objectContaining({ error: expect.any(String) })
      )
      expect(cachedConfig).toBeNull()
    })

    it('should return the cached remote config if it is valid and not expired', async () => {
      const mockLogger: any = { error: jest.fn(), info: jest.fn() }

      jest.spyOn(Bifold.PersistentStorage, 'fetchValueForKey').mockResolvedValue({
        remoteConfig: MOCK_REMOTE_CONFIG,
        timestamp: Date.now(),
      })

      const cachedConfig = await getCachedRemoteConfig(mockLogger)
      expect(cachedConfig).toEqual(MOCK_REMOTE_CONFIG)
    })
  })

  describe('fetchRemoteConfig', () => {
    it('should return null if fetching remote config fails', async () => {
      const mockLogger: any = { error: jest.fn(), info: jest.fn() }
      const mockError = new Error()
      jest.spyOn(axios, 'get').mockRejectedValue(mockError)

      const fetchedConfig = await fetchRemoteConfig(mockLogger)

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error fetching'), mockError)
      expect(fetchedConfig).toBeNull()
    })

    it('should return null if the fetched remote config is invalid', async () => {
      const mockLogger: any = { error: jest.fn(), info: jest.fn() }
      const invalidRemoteConfig = { invalidKey: 'invalidValue' }

      jest.spyOn(axios, 'get').mockResolvedValue({ data: invalidRemoteConfig })

      const fetchedConfig = await fetchRemoteConfig(mockLogger)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('invalid'),
        expect.objectContaining({ error: expect.any(String) })
      )
      expect(fetchedConfig).toBeNull()
    })
  })

  describe('RemoteConfigSchema', () => {
    it('should validate the bundled remote config', () => {
      expect(RemoteConfigSchema.parse(getBundledRemoteConfig())).toBeDefined()
    })
  })
})

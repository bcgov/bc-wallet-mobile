import { VideoDestination } from '@/bcsc-theme/api/hooks/useVideoCallApi'
import { IASEnvironment } from '@/store'

import { getLiveCallVideoQueue, VideoQueue } from './videoDestinations'

const originalDev = __DEV__

describe('VideoQueue', () => {
  // Values are defined by the API
  it('should have correct string values for DEFAULT', () => {
    expect(VideoQueue.DEFAULT).toBe('Default Priority Queue Destination')
  })

  it('should have correct string values for HIGH_PRIORITY', () => {
    expect(VideoQueue.HIGH_PRIORITY).toBe('High Priority Queue Destination')
  })

  it('should have correct string values for TEST', () => {
    expect(VideoQueue.TEST).toBe('Test Harness Queue Destination')
  })
})

describe('videoDestinations', () => {
  describe('getLiveCallVideoQueue', () => {
    afterEach(() => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = originalDev
    })

    it('returns TEST queue when __DEV__ is true even in PROD environment', () => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = true
      const destinations: VideoDestination[] = [
        { destination_name: VideoQueue.DEFAULT, destination_priority: 1 },
        { destination_name: VideoQueue.TEST, destination_priority: 2 },
      ]

      const result = getLiveCallVideoQueue(IASEnvironment.PROD, destinations)

      expect(result).toBe(VideoQueue.TEST)
      expect(result).toBe('Test Harness Queue Destination')
    })

    it('returns null when __DEV__ is true but TEST destination is not available', () => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = true
      const destinations: VideoDestination[] = [{ destination_name: VideoQueue.DEFAULT, destination_priority: 1 }]

      const result = getLiveCallVideoQueue(IASEnvironment.PROD, destinations)

      expect(result).toBeNull()
    })

    it('returns DEFAULT queue when environment is PROD and destination exists', () => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = false
      const destinations: VideoDestination[] = [
        { destination_name: VideoQueue.DEFAULT, destination_priority: 1 },
        { destination_name: VideoQueue.HIGH_PRIORITY, destination_priority: 2 },
      ]

      const result = getLiveCallVideoQueue(IASEnvironment.PROD, destinations)

      expect(result).toBe(VideoQueue.DEFAULT)
      expect(result).toBe('Default Priority Queue Destination')
    })

    it('returns TEST queue when environment is not PROD and destination exists', () => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = false
      const destinations: VideoDestination[] = [
        { destination_name: VideoQueue.TEST, destination_priority: 1 },
        { destination_name: VideoQueue.DEFAULT, destination_priority: 2 },
      ]

      const result = getLiveCallVideoQueue(IASEnvironment.TEST, destinations)

      expect(result).toBe(VideoQueue.TEST)
      expect(result).toBe('Test Harness Queue Destination')
    })

    it('returns TEST queue for SIT environment when destination exists', () => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = false
      const destinations: VideoDestination[] = [{ destination_name: VideoQueue.TEST, destination_priority: 1 }]

      const result = getLiveCallVideoQueue(IASEnvironment.SIT, destinations)

      expect(result).toBe(VideoQueue.TEST)
      expect(result).toBe('Test Harness Queue Destination')
    })

    it('returns null when PROD and DEFAULT queue is not in destinations', () => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = false
      const destinations: VideoDestination[] = [{ destination_name: VideoQueue.TEST, destination_priority: 1 }]

      const result = getLiveCallVideoQueue(IASEnvironment.PROD, destinations)

      expect(result).toBeNull()
    })

    it('returns null when non-PROD and TEST queue is not in destinations', () => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = false
      const destinations: VideoDestination[] = [{ destination_name: VideoQueue.DEFAULT, destination_priority: 1 }]

      const result = getLiveCallVideoQueue(IASEnvironment.DEV, destinations)

      expect(result).toBeNull()
    })

    it('returns null when destinations array is empty', () => {
      // @ts-expect-error - set global DEV
      global.__DEV__ = false
      const result = getLiveCallVideoQueue(IASEnvironment.PROD, [])

      expect(result).toBeNull()
    })
  })
})

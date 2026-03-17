import { VideoDestination } from '@/bcsc-theme/api/hooks/useVideoCallApi'
import { IASEnvironment } from '@/store'

import { getLiveCallVideoQueue, VideoQueue } from './videoDestinations'

describe('videoDestinations', () => {
  describe('getLiveCallVideoQueue', () => {
    it('returns DEFAULT queue when environment is PROD and destination exists', () => {
      const destinations: VideoDestination[] = [
        { destination_name: VideoQueue.DEFAULT, destination_priority: 1 },
        { destination_name: VideoQueue.HIGH_PRIORITY, destination_priority: 2 },
      ]

      const result = getLiveCallVideoQueue(IASEnvironment.PROD, destinations)

      expect(result).toBe(VideoQueue.DEFAULT)
    })

    it('returns TEST queue when environment is not PROD and destination exists', () => {
      const destinations: VideoDestination[] = [
        { destination_name: VideoQueue.TEST, destination_priority: 1 },
        { destination_name: VideoQueue.DEFAULT, destination_priority: 2 },
      ]

      const result = getLiveCallVideoQueue(IASEnvironment.TEST, destinations)

      expect(result).toBe(VideoQueue.TEST)
    })

    it('returns TEST queue for SIT environment when destination exists', () => {
      const destinations: VideoDestination[] = [{ destination_name: VideoQueue.TEST, destination_priority: 1 }]

      const result = getLiveCallVideoQueue(IASEnvironment.SIT, destinations)

      expect(result).toBe(VideoQueue.TEST)
    })

    it('returns null when PROD and DEFAULT queue is not in destinations', () => {
      const destinations: VideoDestination[] = [{ destination_name: VideoQueue.TEST, destination_priority: 1 }]

      const result = getLiveCallVideoQueue(IASEnvironment.PROD, destinations)

      expect(result).toBeNull()
    })

    it('returns null when non-PROD and TEST queue is not in destinations', () => {
      const destinations: VideoDestination[] = [{ destination_name: VideoQueue.DEFAULT, destination_priority: 1 }]

      const result = getLiveCallVideoQueue(IASEnvironment.DEV, destinations)

      expect(result).toBeNull()
    })

    it('returns null when destinations array is empty', () => {
      const result = getLiveCallVideoQueue(IASEnvironment.PROD, [])

      expect(result).toBeNull()
    })
  })
})

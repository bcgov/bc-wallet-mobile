import { VideoDestination } from '@/bcsc-theme/api/hooks/useVideoCallApi'
import { IASEnvironment } from '@/store'

/**
 * Video queues available for live call, as defined by the API response.
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMVC/pages/301577148/System+Interfaces#Video-Destination-Limited-Response
 */
export enum VideoQueue {
  DEFAULT = 'Default Priority Queue Destination',
  HIGH_PRIORITY = 'High Priority Queue Destination',
  TEST = 'Test Harness Queue Destination',
  // Note: Additional test queues exist "Test Harness 100* Queue Destination" 1007-1010
}

/**
 * Determines the appropriate video queue for live calls based on the environment and available video destinations.
 *
 * Questions:
 *    A: When do we use the HIGH_PRIORITY queue vs the DEFAULT queue?
 *      Answer: There is only one destination in PROD (VideoQueue.DEFAULT)
 *    B: Do we need to use the `destination_priority` field to order destinations?
 *      Answer: Not currently. See above.
 *
 * @param environment - The current IAS environment (e.g., PROD, TEST)
 * @param destinations - The list of available video destinations fetched from the API
 * @returns The name of the video queue to use for live calls, or null if no suitable queue is found
 */
export const getLiveCallVideoQueue = (
  environment: IASEnvironment,
  destinations: VideoDestination[]
): VideoQueue | null => {
  let videoQueue = VideoQueue.DEFAULT

  if (environment !== IASEnvironment.PROD) {
    videoQueue = VideoQueue.TEST
  }

  if (__DEV__) {
    // Always use the TEST queue in development
    videoQueue = VideoQueue.TEST
  }

  for (const destination of destinations) {
    if (destination.destination_name === videoQueue) {
      return videoQueue
    }
  }

  return null
}

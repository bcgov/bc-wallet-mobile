/**
 * Whether this journey's send-video upload is still sitting in the SIT review queue: set once the
 * upload is acknowledged, cleared once the scripted review has claimed it. The journeys' teardown
 * reads it to drain an orphan a mid-journey failure would otherwise leave for the next run.
 */
let queuedSubmission = false

export function markSubmissionQueued(): void {
  queuedSubmission = true
}

export function markSubmissionReviewed(): void {
  queuedSubmission = false
}

export function hasQueuedSubmission(): boolean {
  return queuedSubmission
}

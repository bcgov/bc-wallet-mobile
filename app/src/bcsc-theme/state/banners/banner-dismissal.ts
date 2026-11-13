export enum BannerDismissal {
  Dismissed = 'dismissed',
  NotDismissed = 'not_dismissed',
  DismissalEnded = 'dismissal_ended',
}

interface BannerDismissalFacts {
  now: number
  dismissedAt: number | null
  dismissedUntil: number | null
}
/**
 * Determines whether the user's dismissal of a banner still applies, checked in order:
 *   1. `NotDismissed` when no dismissal is recorded.
 *   2. `Dismissed` when the dismissal has no end date.
 *   3. `DismissalEnded` when `dismissedUntil` has been reached (`now >= dismissedUntil`).
 *   4. `Dismissed` while `now` is still before `dismissedUntil`.
 *
 * @param facts - The current time and the recorded `dismissedAt` and `dismissedUntil` timestamps.
 * @returns - Whether the dismissal applies. Only `Dismissed` hides the banner.
 */
export const getBannerDismissal = (facts: BannerDismissalFacts): BannerDismissal => {
  // 1. Not applicable: nothing was ever dismissed
  if (facts.dismissedAt === null) {
    return BannerDismissal.NotDismissed
  }

  // 2. Authoritative signal: dismissed with no end date, so it stays dismissed
  if (facts.dismissedUntil === null) {
    return BannerDismissal.Dismissed
  }

  // 3. Computed value: the end date has been reached, so the banner shows again
  if (facts.now >= facts.dismissedUntil) {
    return BannerDismissal.DismissalEnded
  }

  // 4. Still inside the dismissal window
  return BannerDismissal.Dismissed
}

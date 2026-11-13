export enum RateLimitedAction {
  CardAdd = 'cardAdd',
  QRTransfer = 'qrTransfer',
  Email = 'email',
}

export enum RateLimitWaitType {
  None = 'None',
  Waiting = 'Waiting',
}

export type RateLimitWait =
  | { type: RateLimitWaitType.None }
  | { type: RateLimitWaitType.Waiting; retryAt: Date; minutes: number }

const MS_PER_MINUTE = 60 * 1000

/**
 * The single definition of "the user is waiting". A missing, invalid or elapsed time is None.
 * Minutes round up so the app never shows a shorter wait than the server asked for.
 */
export const getRateLimitWait = (retryAt: string | undefined, now: Date): RateLimitWait => {
  const retryAtMs = retryAt === undefined ? Number.NaN : Date.parse(retryAt)
  const remainingMs = retryAtMs - now.getTime()

  if (Number.isNaN(remainingMs) || remainingMs <= 0) {
    return { type: RateLimitWaitType.None }
  }

  return {
    type: RateLimitWaitType.Waiting,
    retryAt: new Date(retryAtMs),
    minutes: Math.max(1, Math.ceil(remainingMs / MS_PER_MINUTE)),
  }
}

import { ACCOUNT_EXPIRATION_WARNING_DAYS } from '@/constants'
import moment from 'moment'

export interface ExpiryFacts {
  isVerified: boolean
  /** ID token `bcsc_reason` is 'Expired by System' */
  expiredByServer: boolean
  /** Hydration found the stored refresh token expired (#4654) */
  credentialExpired: boolean
  /** Undefined until the account loads */
  cardExpiresAt?: Date
}

export type AccountPhase =
  | { phase: 'none' }
  | { phase: 'unknown' }
  | { phase: 'expired'; expiresAt?: Date }
  | { phase: 'expiringSoon' | 'active'; expiresAt: Date }

/** Whole calendar days from `now` to `date`; 0 means the same day, negative means past. */
export const daysUntil = (date: Date, now: Date): number =>
  moment(date).startOf('day').diff(moment(now).startOf('day'), 'days')

/**
 * The single definition of a card's expiry phase.
 *
 * - `none`: not verified, so there is no card to expire
 * - `unknown`: verified, but no usable date and no server signal (e.g. the account has not loaded)
 * - `expired`: the server or hydration says so, or the expiry date is today or past
 * - `expiringSoon`: within the renewal window, up to the day before expiry
 * - `active`: otherwise
 *
 * Server signals win over the date because they hold even when the account never loads.
 */
export const getAccountPhase = (facts: ExpiryFacts, now: Date): AccountPhase => {
  const { isVerified, expiredByServer, credentialExpired, cardExpiresAt } = facts

  if (!isVerified) {
    return { phase: 'none' }
  }

  const hasDate = cardExpiresAt !== undefined && !Number.isNaN(cardExpiresAt.getTime())

  if (expiredByServer || credentialExpired) {
    return hasDate ? { phase: 'expired', expiresAt: cardExpiresAt } : { phase: 'expired' }
  }

  if (!hasDate) {
    return { phase: 'unknown' }
  }

  const days = daysUntil(cardExpiresAt, now)

  if (days <= 0) {
    return { phase: 'expired', expiresAt: cardExpiresAt }
  }

  if (days <= ACCOUNT_EXPIRATION_WARNING_DAYS) {
    return { phase: 'expiringSoon', expiresAt: cardExpiresAt }
  }

  return { phase: 'active', expiresAt: cardExpiresAt }
}

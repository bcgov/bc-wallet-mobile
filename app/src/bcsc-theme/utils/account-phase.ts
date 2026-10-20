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

export enum AccountPhaseType {
  None = 'none',
  Unknown = 'unknown',
  Expired = 'expired',
  ExpiringSoon = 'expiringSoon',
  Active = 'active',
}

export type AccountPhase =
  | { phase: AccountPhaseType.None }
  | { phase: AccountPhaseType.Unknown }
  | { phase: AccountPhaseType.Expired; expiresAt?: Date }
  | { phase: AccountPhaseType.ExpiringSoon | AccountPhaseType.Active; expiresAt: Date }

/** Whole calendar days from `now` to `date`; 0 means the same day, negative means past. */
const daysUntil = (date: Date, now: Date): number =>
  moment(date).startOf('day').diff(moment(now).startOf('day'), 'days')

/**
 * The single definition of a card's expiry phase. Server signals win over the date because they hold
 * even when the account never loads; `unknown` means verified with no usable date and no signal.
 */
export const getAccountPhase = (facts: ExpiryFacts, now: Date): AccountPhase => {
  const { isVerified, expiredByServer, credentialExpired, cardExpiresAt } = facts

  if (!isVerified) {
    return { phase: AccountPhaseType.None }
  }

  const hasDate = cardExpiresAt !== undefined && !Number.isNaN(cardExpiresAt.getTime())

  if (expiredByServer || credentialExpired) {
    return hasDate ? { phase: AccountPhaseType.Expired, expiresAt: cardExpiresAt } : { phase: AccountPhaseType.Expired }
  }

  if (!hasDate) {
    return { phase: AccountPhaseType.Unknown }
  }

  const days = daysUntil(cardExpiresAt, now)

  if (days <= 0) {
    return { phase: AccountPhaseType.Expired, expiresAt: cardExpiresAt }
  }

  if (days <= ACCOUNT_EXPIRATION_WARNING_DAYS) {
    return { phase: AccountPhaseType.ExpiringSoon, expiresAt: cardExpiresAt }
  }

  return { phase: AccountPhaseType.Active, expiresAt: cardExpiresAt }
}

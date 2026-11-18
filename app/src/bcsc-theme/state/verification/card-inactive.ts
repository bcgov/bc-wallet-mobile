import { BCSCReason } from '@/bcsc-theme/utils/id-token'

export interface CardInactiveFacts {
  /** The credential record read at unlock says cancelled or expired */
  recordDeactivated: boolean
  /** `bcscReason` from the saved account details; undefined until a check has saved them */
  savedReason?: string
  /** The device holds a credential record or a refresh token, so there is a registration to describe */
  hasRegistration: boolean
}

/**
 * The single definition of "card not active". Cancel reasons are not part of it: a cancelled card is
 * sent to the device-invalidated screen instead. No saved details means nothing to judge, and details
 * left over from a reset registration (no record, no token) describe nothing the device still holds.
 */
export const isCardInactive = ({ recordDeactivated, savedReason, hasRegistration }: CardInactiveFacts): boolean =>
  recordDeactivated || (hasRegistration && savedReason === BCSCReason.ExpiredBySystem)

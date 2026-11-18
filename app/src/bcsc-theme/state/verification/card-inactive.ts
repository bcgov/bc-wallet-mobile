import { BCSCReason } from '@/bcsc-theme/utils/id-token'

export interface CardInactiveFacts {
  /** The credential record read at unlock says cancelled or expired */
  recordDeactivated: boolean
  /** `bcscReason` from the saved account details; undefined until a check has saved them */
  savedReason?: string
}

/**
 * The single definition of "card not active". Cancel reasons are not part of it: a cancelled card is
 * sent to the device-invalidated screen instead. No saved details means nothing to judge.
 */
export const isCardInactive = ({ recordDeactivated, savedReason }: CardInactiveFacts): boolean =>
  recordDeactivated || savedReason === BCSCReason.ExpiredBySystem

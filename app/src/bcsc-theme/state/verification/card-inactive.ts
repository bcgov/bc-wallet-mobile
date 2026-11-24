import { BCSCEvent, BCSCReason } from '@/bcsc-theme/utils/id-token'

export interface CardInactiveFacts {
  /** The credential record read at unlock says cancelled or expired */
  recordDeactivated: boolean
  /** `bcscEvent` from the saved account details; undefined until a check saves them, and in details saved before the field existed */
  savedEvent?: string
  /** `bcscReason` from the saved account details; decides only when no event was saved */
  savedReason?: string
  /** The device holds a credential record or a refresh token, so there is a registration to describe */
  hasRegistration: boolean
}

// Expired and cancelled are one state: the record stays and the card is not active
const isInactiveEvent = (event: string): boolean => event === BCSCEvent.Expire || event === BCSCEvent.Cancel

/**
 * The single definition of "card not active". The server's saved event decides: Expire and Cancel. A cancelled
 * card is still sent to the device-invalidated screen as well. Details saved before the event was kept fall
 * back to the reason, so an expiry saved then still reads as inactive. No saved details means nothing to
 * judge, and details left over from a reset registration (no record, no token) describe nothing the device
 * still holds.
 */
export const isCardInactive = ({
  recordDeactivated,
  savedEvent,
  savedReason,
  hasRegistration,
}: CardInactiveFacts): boolean => {
  if (recordDeactivated) {
    return true
  }

  const savedSaysInactive =
    savedEvent === undefined ? savedReason === BCSCReason.ExpiredBySystem : isInactiveEvent(savedEvent)

  return hasRegistration && savedSaysInactive
}

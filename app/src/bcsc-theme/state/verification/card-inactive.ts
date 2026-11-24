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
 * The single definition of "card not active": the record says so, or the saved server event is Expire or Cancel.
 * Details saved before the event was kept fall back to the reason; none count once no record or token remains.
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

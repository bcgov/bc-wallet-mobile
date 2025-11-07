import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCDispatchAction } from '@/store'
import moment from 'moment'
import { SystemCheckStrategy, SystemCheckUtils } from './system-checks'

const CARD_EXPIRATION_WARNING_DAYS = 30

/**
 * Checks if the user's card is expired or close to expiration.
 *
 * @class CardExpirySystemCheck
 * @implements {SystemCheckStrategy}
 */
export class CardExpirySystemCheck implements SystemCheckStrategy {
  private readonly cardExpiration: Date
  private readonly utils: SystemCheckUtils
  private daysUntilExpired: number = 0

  constructor(cardExpiration: Date, utils: SystemCheckUtils) {
    this.cardExpiration = cardExpiration
    this.utils = utils
  }

  runCheck() {
    this.daysUntilExpired = moment(this.cardExpiration).diff(moment(), 'days')

    // Return true if the card is expired or within the warning period
    return this.daysUntilExpired <= CARD_EXPIRATION_WARNING_DAYS
  }

  onFail() {
    // Card is expired
    if (this.daysUntilExpired <= 0) {
      // TODO (MD): Handle card expired path
    }

    // Card is expiring soon
    this.utils.dispatch({
      type: BCDispatchAction.ADD_BANNER_MESSAGE,
      payload: [
        {
          id: BCSCBanner.CARD_EXPIRING_SOON,
          title: this.utils.translation('Unified.SystemChecks.CardExpiry.CardExpiredBannerTitle', {
            cardExpiration: moment(this.cardExpiration).format('LL'), // ie: January 1, 2025
          }),
          type: 'warning',
          varaint: 'summary',
          dismissible: true,
        },
      ],
    })
  }

  onSuccess() {
    this.utils.dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [BCSCBanner.CARD_EXPIRING_SOON] })
  }
}

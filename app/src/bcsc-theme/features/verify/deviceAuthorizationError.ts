import { CONTACT_US_GOVERNMENT_WEBSITE_URL, GET_BCSC_CARD_URL } from '@/constants'

/**
 * Device authorization (device/code) 400 error codes that render the generic
 * title/description/link-out-button layout in DeviceAuthorizationErrorScreen.
 *
 * card_not_found and card_expired are handled separately by VerificationCardErrorScreen
 * (VerificationCardError.MismatchedSerial / .CardExpired) and are not part of this set.
 */
export enum DeviceAuthorizationError {
  InvalidParameter = 'InvalidParameter',
  CardInactive = 'CardInactive',
  CardReplaced = 'CardReplaced',
  CardCancelled = 'CardCancelled',
  CardRenewed = 'CardRenewed',
  NonPhotoCard = 'NonPhotoCard',
  CardProblem = 'CardProblem',
  AdditionalCard = 'AdditionalCard',
  UnderMinimumAge = 'UnderMinimumAge',
  TooManyMobileCards = 'TooManyMobileCards',
  MismatchedSerial = 'MismatchedSerial', // TODO: swap this with invalidparameter
  CardExpired = 'CardExpired',
}

export interface DeviceAuthorizationErrorConfig {
  headingKey: string
  descriptionKey: string
  buttonTextKey: string
  buttonUrl: string
  buttonVisible: boolean
}

/** Title/description/link-out-button config for every DeviceAuthorizationError. */
export const DEVICE_AUTHORIZATION_ERROR_CONFIG: Record<DeviceAuthorizationError, DeviceAuthorizationErrorConfig> = {
  [DeviceAuthorizationError.InvalidParameter]: {
    headingKey: 'BCSC.DeviceAuthorizationError.InvalidParameter.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.InvalidParameter.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.InvalidParameter.ButtonText',
    buttonUrl: '',
    buttonVisible: false,
  },
  [DeviceAuthorizationError.CardInactive]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardInactive.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardInactive.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardInactive.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
    buttonVisible: true,
  },
  [DeviceAuthorizationError.CardReplaced]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardReplaced.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardReplaced.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardReplaced.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
    buttonVisible: true,
  },
  [DeviceAuthorizationError.CardCancelled]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardCancelled.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardCancelled.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardCancelled.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
    buttonVisible: true,
  },
  [DeviceAuthorizationError.CardRenewed]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardRenewed.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardRenewed.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardRenewed.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
    buttonVisible: true,
  },
  [DeviceAuthorizationError.NonPhotoCard]: {
    headingKey: 'BCSC.DeviceAuthorizationError.NonPhotoCard.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.NonPhotoCard.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.NonPhotoCard.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
    buttonVisible: true,
  },
  [DeviceAuthorizationError.CardProblem]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardProblem.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardProblem.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardProblem.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
    buttonVisible: true,
  },
  [DeviceAuthorizationError.AdditionalCard]: {
    headingKey: 'BCSC.DeviceAuthorizationError.AdditionalCard.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.AdditionalCard.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.AdditionalCard.ButtonText',
    buttonUrl: '',
    buttonVisible: false,
  },
  [DeviceAuthorizationError.UnderMinimumAge]: {
    headingKey: 'BCSC.DeviceAuthorizationError.UnderMinimumAge.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.UnderMinimumAge.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.UnderMinimumAge.ButtonText',
    buttonUrl: '',
    buttonVisible: false,
  },
  [DeviceAuthorizationError.TooManyMobileCards]: {
    headingKey: 'BCSC.DeviceAuthorizationError.TooManyMobileCards.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.TooManyMobileCards.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.TooManyMobileCards.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
    buttonVisible: true,
  },
  [DeviceAuthorizationError.CardExpired]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardExpired.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardExpired.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardExpired.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
    buttonVisible: true,
  },
  [DeviceAuthorizationError.MismatchedSerial]: {
    headingKey: 'BCSC.DeviceAuthorizationError.MismatchedSerial.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.MismatchedSerial.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.MismatchedSerial.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
    buttonVisible: true,
  },
}

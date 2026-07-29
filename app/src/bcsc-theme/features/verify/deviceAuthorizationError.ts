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
}

export interface DeviceAuthorizationErrorConfig {
  headingKey: string
  descriptionKey: string
  buttonTextKey: string
  buttonUrl: string
}

/** Title/description/link-out-button config for every DeviceAuthorizationError. */
export const DEVICE_AUTHORIZATION_ERROR_CONFIG: Record<DeviceAuthorizationError, DeviceAuthorizationErrorConfig> = {
  [DeviceAuthorizationError.InvalidParameter]: {
    headingKey: 'BCSC.DeviceAuthorizationError.InvalidParameter.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.InvalidParameter.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.InvalidParameter.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
  },
  [DeviceAuthorizationError.CardInactive]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardInactive.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardInactive.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardInactive.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
  },
  [DeviceAuthorizationError.CardReplaced]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardReplaced.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardReplaced.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardReplaced.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
  },
  [DeviceAuthorizationError.CardCancelled]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardCancelled.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardCancelled.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardCancelled.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
  },
  [DeviceAuthorizationError.CardRenewed]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardRenewed.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardRenewed.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardRenewed.ButtonText',
    buttonUrl: GET_BCSC_CARD_URL,
  },
  [DeviceAuthorizationError.NonPhotoCard]: {
    headingKey: 'BCSC.DeviceAuthorizationError.NonPhotoCard.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.NonPhotoCard.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.NonPhotoCard.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
  },
  [DeviceAuthorizationError.CardProblem]: {
    headingKey: 'BCSC.DeviceAuthorizationError.CardProblem.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.CardProblem.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.CardProblem.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
  },
  [DeviceAuthorizationError.AdditionalCard]: {
    headingKey: 'BCSC.DeviceAuthorizationError.AdditionalCard.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.AdditionalCard.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.AdditionalCard.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
  },
  [DeviceAuthorizationError.UnderMinimumAge]: {
    headingKey: 'BCSC.DeviceAuthorizationError.UnderMinimumAge.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.UnderMinimumAge.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.UnderMinimumAge.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
  },
  [DeviceAuthorizationError.TooManyMobileCards]: {
    headingKey: 'BCSC.DeviceAuthorizationError.TooManyMobileCards.Heading',
    descriptionKey: 'BCSC.DeviceAuthorizationError.TooManyMobileCards.Description',
    buttonTextKey: 'BCSC.DeviceAuthorizationError.TooManyMobileCards.ButtonText',
    buttonUrl: CONTACT_US_GOVERNMENT_WEBSITE_URL,
  },
}

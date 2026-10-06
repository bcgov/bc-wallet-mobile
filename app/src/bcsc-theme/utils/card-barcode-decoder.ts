import { BCCardBarcode, CardBarcodeFailure, decodeBCCardBarcode } from '@/bcsc-theme/utils/bc-card-barcode'
import { parseLooseSerial } from '@/bcsc-theme/utils/card-serial'
import { BarcodeFormat } from 'react-native-vision-camera-barcode-scanner'

// Stub interface representing a scanned code ie: barcode or qr code
export interface ScanableCode {
  type: BarcodeFormat | 'unknown'
  value?: string
}

export interface DriversLicenseMetadata {
  licenseNumber: string
  firstName: string
  middleNames: string
  lastName: string
  birthDate: Date
  expiryDate: Date
  streetAddress: string
  /** Further street lines, when the address has more than one before the city line. */
  streetAddress2?: string
  city: string
  province: string
  postalCode: string
  /** Issuer Identification Number from AAMVA track 2 (e.g. BC = '636028'). */
  isoIIN: string
}

/** The result of decoding one scanned code, tagged with the barcode it came from. */
export type DecodedCardBarcode =
  | { source: '1d'; serial: string }
  | { source: 'pdf417'; card: BCCardBarcode }
  | CardBarcodeFailure

/**
 * Decodes one scanned code: a Code 39 or Code 128 serial, or the PDF-417 on a BC driver's licence,
 * BCID, BC Services Card or combo card. The result follows the barcode type, never the value's shape.
 *
 * Never throws; a code that does not decode comes back as a failure with a reason.
 */
export const decodeCardBarcode = (code: ScanableCode): DecodedCardBarcode => {
  // The camera's value is not guaranteed to be a string at runtime.
  if (typeof code.value !== 'string' || code.value === '') {
    return { source: 'failure', reason: 'damaged' }
  }

  switch (code.type) {
    case 'code-39':
    case 'code-128': {
      const serial = parseLooseSerial(code.value)
      return serial ? { source: '1d', serial } : { source: 'failure', reason: 'unsupported' }
    }
    case 'pdf-417': {
      const card = decodeBCCardBarcode(code.value)
      return 'source' in card ? card : { source: 'pdf417', card }
    }
    default:
      return { source: 'failure', reason: 'unsupported' }
  }
}

const BC_ISSUER_NUMBER = '636028'

// AAMVA header: compliance indicator, data separator, record separator and segment terminator, then
// the file type and the issuer number.
const AAMVA_HEADER_PREFIX = '@\n\u001e\r'
const AAMVA_FILE_TYPE_AND_ISSUER = /^(?:ANSI |AAMVA)(\d{6})/

/**
 * Whether a PDF-417 value is positively an AAMVA licence or ID card issued by someone other than BC,
 * e.g. another province or a US state. Such cards are not decoded here (they are not in the BC layout),
 * but they are known not to be a BC Services Card, unlike a read that is merely unrecognised.
 */
export const isOtherIssuerAamvaCard = (value: string): boolean => {
  if (!value.startsWith(AAMVA_HEADER_PREFIX)) {
    return false
  }

  const issuer = AAMVA_FILE_TYPE_AND_ISSUER.exec(value.slice(AAMVA_HEADER_PREFIX.length))?.[1]
  return issuer !== undefined && issuer !== BC_ISSUER_NUMBER
}

export const toDriversLicenseMetadata = (card: BCCardBarcode): DriversLicenseMetadata => {
  const [firstName = '', ...middleNames] = card.givenNames.split(' ').filter(Boolean)
  const [streetAddress = '', ...streetAddress2] = card.streetAddressLines
  const [birthYear, birthMonth, birthDay] = card.birthDate.split('-').map(Number)
  const [expiryYear, expiryMonth] = card.expiry.split('-').map(Number)

  return {
    licenseNumber: card.cardNumber,
    isoIIN: card.isoIIN,
    firstName: firstName.toLowerCase(),
    middleNames: middleNames.join(' ').toLowerCase(),
    lastName: card.surname.toLowerCase(),
    birthDate: new Date(birthYear, birthMonth - 1, birthDay),
    // The card holds only the expiry month; day 0 of the next month is its last day, as the v3 apps and IAS use.
    expiryDate: new Date(expiryYear, expiryMonth, 0),
    streetAddress: streetAddress.toLowerCase(),
    streetAddress2: streetAddress2.join(' ').toLowerCase() || undefined,
    city: card.city.toLowerCase(),
    province: card.province,
    postalCode: card.postalCode,
  }
}

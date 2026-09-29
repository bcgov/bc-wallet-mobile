import { BCCardBarcode, decodeBCCardBarcode } from '../bc-card-barcode'
import {
  DecodedCodeKind,
  DecoderStrategy,
  DriversLicenseBarcode,
  DriversLicenseDecodedBarcode,
  DriversLicenseMetadata,
  ScanableCode,
} from './DecoderStrategy'

/**
 * Decoder for the PDF-417 barcode on BC driver's licences, BCIDs, BC Services Cards and combo cards.
 * Parsing follows ICBC's 3-track layout; see {@link decodeBCCardBarcode}.
 *
 * @class
 * @implements {DecoderStrategy}
 */
export class DriversLicenseBarcodeDecoder implements DecoderStrategy {
  canDecode(barcode: ScanableCode): barcode is DriversLicenseBarcode {
    return (
      barcode.type === 'pdf-417' && typeof barcode.value === 'string' && decodeBCCardBarcode(barcode.value) !== null
    )
  }

  decode(barcode: DriversLicenseBarcode): DriversLicenseDecodedBarcode {
    const card = barcode.type === 'pdf-417' ? decodeBCCardBarcode(barcode.value) : null
    if (!card) {
      throw new Error("Failed to decode driver's license barcode. Did you forget to check if it can be decoded?")
    }

    return { kind: DecodedCodeKind.DriversLicenseBarcode, ...toDriversLicenseMetadata(card) }
  }
}

const toDriversLicenseMetadata = (card: BCCardBarcode): DriversLicenseMetadata => {
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

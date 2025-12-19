import { isBCSCSerial } from './BCServicesCardBarcodeDecoder'
import {
  BCServicesComboCardDecodedBarcode,
  DecodedCodeKind,
  DecoderStrategy,
  DriversLicenseBarcode,
  ScanableCode,
} from './DecoderStrategy'
import { DriversLicenseBarcodeDecoder } from './DriversLicenseBarcodeDecoder'

const BCSC_SERIAL_LENGTH = 9

/**
 * Decoder for BC Services Combo Card PDF-417 barcodes.
 *
 * BC Services Combo Cards issued in 2025 and later encode both the
 * driver’s licence data and the BCSC serial number in a single
 * PDF-417 barcode located on the bottom of the card.
 *
 * These cards also include a separate Code 39 barcode containing
 * only the BCSC serial number on the right side of the card.
 *
 * Combo Cards issued before 2025 use separate barcodes:
 * 	- PDF-417 for the driver’s licence
 * 	- Code 39 for the BCSC serial number
 *
 * @example
 * // Example BC combo barcode:
 * `%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU                          00S00023254?`
 *
 * @class
 * @implements {DecoderStrategy}
 */
export class BCComboCardBarcodeDecoder implements DecoderStrategy {
  driversLicenseDecoder: DriversLicenseBarcodeDecoder

  constructor() {
    this.driversLicenseDecoder = new DriversLicenseBarcodeDecoder()
  }

  canDecode(barcode: ScanableCode): barcode is DriversLicenseBarcode {
    return this.driversLicenseDecoder.canDecode(barcode) && this.parseBcscSerial(barcode.value) !== null
  }

  decode(barcode: DriversLicenseBarcode): BCServicesComboCardDecodedBarcode {
    const decodedDriversLicense = this.driversLicenseDecoder.decode(barcode)
    const bcscSerial = this.parseBcscSerial(barcode.value)

    if (!bcscSerial) {
      throw new Error(
        'Failed to decode BCSC serial from combo card barcode. Did you forget to check if it can be decoded?'
      )
    }

    return {
      kind: DecodedCodeKind.BCServicesComboCardCardBarcode,
      bcscSerial: bcscSerial,
      licenseNumber: decodedDriversLicense.licenseNumber,
      firstName: decodedDriversLicense.firstName,
      middleNames: decodedDriversLicense.middleNames,
      lastName: decodedDriversLicense.lastName,
      birthDate: decodedDriversLicense.birthDate,
      expiryDate: decodedDriversLicense.expiryDate,
      streetAddress: decodedDriversLicense.streetAddress,
      postalCode: decodedDriversLicense.postalCode,
      city: decodedDriversLicense.city,
      province: decodedDriversLicense.province,
    }
  }

  private parseBcscSerial(value: string): string | null {
    const rawSerial = value.split(' ').at(-1)

    if (!rawSerial) {
      return null
    }

    const bcscSerial = rawSerial.replace('?', '').slice(-BCSC_SERIAL_LENGTH)

    // BCSC serials start with a letter followed by numbers
    if (!isBCSCSerial(bcscSerial)) {
      return null
    }

    return bcscSerial
  }
}

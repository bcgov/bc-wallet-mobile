import {
  BCServicesComboCardDecodedBarcode,
  DecodedCodeKind,
  DecoderStrategy,
  DriversLicenseBarcode,
  ScanableCode,
} from './DecoderStrategy'
import { DriversLicenseBarcodeDecoder } from './DriversLicenseBarcodeDecoder'

const BCSC_SERIAL_LENGTH = 9 // QUESTION: Is this always 9 characters long?

/**
 * Decoder for BC Services Combo Card barcodes (PDF-417)
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
        'Failed to parse BCSC serial from combo card barcode. Did you forget to check if it can be decoded?'
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
    if (/^[A-Za-z][0-9]+$/.test(bcscSerial) === false) {
      return null
    }

    return bcscSerial
  }
}

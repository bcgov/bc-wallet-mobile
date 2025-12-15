import {
  DecodedCodeKind,
  DecoderStrategy,
  DriversLicenseBarcode,
  DriversLicenseDecodedBarcode,
  ScanableCode,
} from './DecoderStrategy'

const CURRENT_MILLENNIUM = 2000

/**
 * Decoder for Driver's License barcodes (PDF-417)
 *
 * @example
 * // Example BC drivers license barcode:
 * `"%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"`
 *
 * @class
 * @implements {DecoderStrategy}
 */
export class DriversLicenseBarcodeDecoder implements DecoderStrategy {
  canDecode(barcode: ScanableCode): barcode is DriversLicenseBarcode {
    return (
      barcode.type === 'pdf-417' &&
      typeof barcode.value === 'string' &&
      barcode.value.startsWith('%') &&
      barcode.value.endsWith('?')
    )
  }

  decode(barcode: DriversLicenseBarcode): DriversLicenseDecodedBarcode {
    if (!this.canDecode(barcode)) {
      throw new Error("Failed to decode driver's license barcode. Did you forget to check if it can be decoded?")
    }
    const names = this.parseLicenseNames(barcode.value)
    const address = this.parseLicenseAddress(barcode.value)
    const dates = this.parseLicenseDates(barcode.value)
    const licenseNumber = this.parseLicenseNumber(barcode.value)

    return {
      kind: DecodedCodeKind.DriversLicenseBarcode,
      licenseNumber: licenseNumber,
      firstName: names.firstName,
      middleNames: names.middleNames,
      lastName: names.lastName,
      birthDate: dates.birthDate,
      expiryDate: dates.expiryDate,
      streetAddress: address.streetAddress,
      postalCode: address.postalCode,
      city: address.city,
      province: address.province,
    }
  }

  private parseLicenseNames(value: string): { firstName: string; middleNames: string; lastName: string } {
    const nameSection = value.split('^')[1]

    const firstName = nameSection.split('$')[1].split(' ')[0]
    const middleNames = nameSection.split(' ').slice(1).join(' ')
    const lastName = nameSection.split(',')[0]
    return {
      firstName: firstName.toLowerCase().trim(),
      middleNames: middleNames.toLowerCase().trim(),
      lastName: lastName.toLowerCase().trim(),
    }
  }

  private parseLicenseAddress(value: string): {
    streetAddress: string
    city: string
    province: string
    postalCode: string
  } {
    const addressSection = value.split('^')[2]

    const streetAddress = addressSection.split('$')[0]
    const city = addressSection.split('$')[1].split(' ')[0]
    const province = addressSection.split('$')[1].split(' ')[1]
    const postalCode = addressSection.split('$')[1].split(' ').slice(2).join(' ')
    return {
      streetAddress: streetAddress.toLowerCase().trim(),
      city: city.toLowerCase().trim(),
      province: province.trim(),
      postalCode: postalCode.trim(),
    }
  }

  private parseLicenseDates(value: string): { expiryDate: Date; birthDate: Date } {
    const licenseSection = value.split('^')[3]
    const rawBirthdate = licenseSection.split('=')[1]

    const birthYear = parseInt(rawBirthdate.slice(4, 8))
    const birthMonth = parseInt(rawBirthdate.slice(8, 10)) - 1 // Months are zero-indexed
    const birthDay = parseInt(rawBirthdate.slice(10, 12))

    const expiryYear = parseInt(rawBirthdate.slice(0, 2)) + CURRENT_MILLENNIUM // TODO (MD): Handle century rollover
    const expiryMonth = parseInt(rawBirthdate.slice(2, 4)) - 1 // Months are zero-indexed

    return {
      expiryDate: new Date(expiryYear, expiryMonth, birthDay),
      birthDate: new Date(birthYear, birthMonth, birthDay),
    }
  }

  private parseLicenseNumber(value: string): string {
    const licenseSection = value.split('^')[3]
    const rawLicenseNumber = licenseSection.split('=')[0]
    return rawLicenseNumber.slice(8).trim()
  }
}

import {
  DecodedCodeKind,
  DecoderStrategy,
  DriversLicenseBarcode,
  DriversLicenseDecodedBarcode,
  ScanableCode,
} from './DecoderStrategy'

/**
 * Decoder for British Columbia Driver's Licence PDF-417 barcodes.
 *
 * These barcodes encode driver's licence and cardholder data in AAMVA
 * 3-track magnetic stripe format inside a single PDF-417 barcode.
 *
 * Track layout:
 *   Track 1: `%[city]^[last],[first middle]^[address]?`
 *   Track 2: `;[IIN(6)][license#]=[YYMM_expiry][YYYYMMDD_birth]=?`
 *   Track 3: `_[additional data]?`
 *
 * Some cards insert an extra `^` between track 1 and track 2 (`...3Y8^?;636...`)
 * while others do not (`...3Y5?;636...`). The parser handles both formats by
 * extracting track 2 data via regex rather than relying on `^` delimiter count.
 *
 * @example
 * // 4-caret format (extra ^ before track separator):
 * `"%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"`
 *
 * // 3-caret format (no extra ^):
 * `"%BCVICTORIA^CPSIJSIT,$STANDALONE CITZ FOUR^910 GOVERNMENT ST$VICTORIA BC V8W 3Y5?;636028004023964=270419850410=?_%0AV8W3Y5                     F            9873904417                00C00015303?"`
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
      barcode.value.endsWith('?') &&
      /;\d+=\d+=/.test(barcode.value) // Basic check for track 2 format
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
    let addressSection = value.split('^')[2]

    // Truncate at the track 1 terminator '?' to prevent track 2/3 data from
    // leaking into address fields. Some cards omit the extra '^' between
    // track 1 and track 2, so the address section may contain ';636028...' garbage.
    const trackEnd = addressSection.indexOf('?')
    if (trackEnd !== -1) {
      addressSection = addressSection.substring(0, trackEnd)
    }

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

  /**
   * Extract dates from AAMVA track 2.
   * Track 2 format: `;[IIN(6)][license#]=[YYMM_expiry][YYYYMMDD_birth]=?`
   */
  private parseLicenseDates(value: string): { expiryDate: Date; birthDate: Date } {
    const match = value.match(/;\d+=(\d{4})(\d{4})(\d{2})(\d{2})=/)
    if (!match) {
      throw new Error('Failed to parse dates from AAMVA track 2')
    }

    const expiryYear = Number.parseInt(match[1].slice(0, 2))
    const expiryMonth = Number.parseInt(match[1].slice(2, 4)) - 1 // Months are zero-indexed

    const birthYear = Number.parseInt(match[2])
    const birthMonth = Number.parseInt(match[3]) - 1 // Months are zero-indexed
    const birthDay = Number.parseInt(match[4])

    const currentCenturyBase = Math.floor(new Date().getFullYear() / 100) * 100
    const adjustedExpiryYear = currentCenturyBase + expiryYear

    return {
      expiryDate: new Date(adjustedExpiryYear, expiryMonth, birthDay),
      birthDate: new Date(birthYear, birthMonth, birthDay),
    }
  }

  /**
   * Extract license number from AAMVA track 2.
   * Track 2 format: `;[IIN(6)][license#]=[dates]=?`
   */
  private parseLicenseNumber(value: string): string {
    const match = value.match(/;\d{6}(\d+)=/)
    if (!match) {
      throw new Error('Failed to parse license number from AAMVA track 2')
    }
    return match[1].trim()
  }
}

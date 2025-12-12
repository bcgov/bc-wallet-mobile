import {
  Barcode,
  BarcodeDecoderStrategy,
  DecodedBarcodeKind,
  DriversLicenseBarcode,
  DriversLicenseDecodedBarcode,
} from './barcode-decoder-strategy'

/**
 * Decoder for Driver's License barcodes (PDF-417)
 */
export class DriversLicenseBarcodeDecoder implements BarcodeDecoderStrategy {
  canDecode(barcode: Barcode): barcode is DriversLicenseBarcode {
    return barcode.type === 'pdf-417' && typeof barcode.value === 'string'
  }

  decodeBarcode(barcode: DriversLicenseBarcode): DriversLicenseDecodedBarcode {
    const names = this.parseLicenseNames(barcode.value)
    const address = this.parseLicenseAddress(barcode.value)
    const birthdate = this.parseLicenseBirthdate(barcode.value)
    const licenseNumber = this.parseLicenseNumber(barcode.value)

    return {
      kind: DecodedBarcodeKind.DriversLicenseBarcode,
      licenseNumber: licenseNumber,
      firstName: names.firstName,
      middleNames: names.middleNames,
      lastName: names.lastName,
      birthDate: birthdate,
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
    return { firstName, middleNames, lastName }
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
    const province = addressSection.split(' ')[1]
    const postalCode = addressSection.split(' ').slice(2).join('')
    return { streetAddress, city, province, postalCode }
  }

  private parseLicenseBirthdate(value: string): Date {
    const licenseSection = value.split('^')[3]
    const rawBirthdate = licenseSection.split('=')[1]
    return new Date(`${rawBirthdate.slice(0, 8)}`)
  }

  private parseLicenseNumber(value: string): string {
    const licenseSection = value.split('^')[3]
    const rawLicenseNumber = licenseSection.split('=')[0]
    return rawLicenseNumber.slice(8)
  }
}

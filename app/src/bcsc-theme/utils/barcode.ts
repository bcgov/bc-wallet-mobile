import { BarcodePayload } from 'react-native-bcsc-core'
import { DriversLicenseMetadata } from './decoder-strategy/DecoderStrategy'

export const buildBarcodePayload = (
  bcscSerial: string | null,
  license: DriversLicenseMetadata | null
): BarcodePayload[] => {
  const barcodes: BarcodePayload[] = []

  if (license) {
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    barcodes.push({
      type: 'PDF_417',
      content_type: 'AAMVA_3TRACK_PDF417',
      version: '',
      jurisdiction_version: '',
      iso_iin: '',
      customer_id: '',
      document_number: license.licenseNumber ?? '',
      family_name: license.lastName ?? '',
      given_names: `${license.firstName ?? ''}${license.middleNames ? ' ' + license.middleNames : ''}`.trim(),
      birthdate: license.birthDate ? formatDate(license.birthDate) : '',
      expires: license.expiryDate ? formatDate(license.expiryDate) : '',
      address: {
        street_address: license.streetAddress ?? '',
        locality: license.city ?? '',
        province: license.province ?? '',
        postal_code: license.postalCode ?? '',
        country: '',
      },
    })
  }

  if (bcscSerial) {
    barcodes.push({
      type: 'CODE_128',
      value: bcscSerial,
    })
  }

  return barcodes
}

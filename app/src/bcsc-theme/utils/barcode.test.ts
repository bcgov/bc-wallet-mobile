import { buildBarcodePayload } from './barcode'
import { DriversLicenseMetadata } from './decoder-strategy/DecoderStrategy'

const makeLicense = (overrides?: Partial<DriversLicenseMetadata>): DriversLicenseMetadata => ({
  licenseNumber: '2222222',
  firstName: 'TEST',
  middleNames: 'CARD',
  lastName: 'SPECIMEN',
  birthDate: new Date('1970-03-10'),
  expiryDate: new Date('2024-03-10'),
  streetAddress: '910 GOVERNMENT ST',
  city: 'VICTORIA',
  province: 'BC',
  postalCode: 'V8W 3Y8',
  ...overrides,
})

describe('buildBarcodePayload', () => {
  it('should return empty array when both inputs are null', () => {
    expect(buildBarcodePayload(null, null)).toEqual([])
  })

  it('should return a CODE_128 entry for a BCSC serial only', () => {
    const result = buildBarcodePayload('S00023254', null)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: 'CODE_128',
      value: 'S00023254',
    })
  })

  it('should return a PDF_417 entry for a license only', () => {
    const result = buildBarcodePayload(null, makeLicense())

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: 'PDF_417',
      content_type: 'AAMVA_3TRACK_PDF417',
      version: '',
      jurisdiction_version: '',
      iso_iin: '',
      customer_id: '',
      document_number: '2222222',
      family_name: 'SPECIMEN',
      given_names: 'TEST CARD',
      birthdate: '1970-03-10',
      expires: '2024-03-10',
      address: {
        street_address: '910 GOVERNMENT ST',
        locality: 'VICTORIA',
        province: 'BC',
        postal_code: 'V8W 3Y8',
        country: '',
      },
    })
  })

  it('should return both PDF_417 and CODE_128 entries for a combo card', () => {
    const result = buildBarcodePayload('S00023254', makeLicense())

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ type: 'PDF_417', document_number: '2222222' })
    expect(result[1]).toEqual({ type: 'CODE_128', value: 'S00023254' })
  })

  it('should format given_names with first name only when no middle names', () => {
    const result = buildBarcodePayload(null, makeLicense({ middleNames: '' }))

    expect(result[0]).toMatchObject({ given_names: 'TEST' })
  })

  it('should default missing optional license fields to empty strings', () => {
    const result = buildBarcodePayload(
      null,
      makeLicense({
        licenseNumber: undefined as any,
        lastName: undefined as any,
        firstName: undefined as any,
        middleNames: undefined as any,
        streetAddress: undefined as any,
        city: undefined as any,
        province: undefined as any,
        postalCode: undefined as any,
      })
    )

    const payload = result[0] as any
    expect(payload.document_number).toBe('')
    expect(payload.family_name).toBe('')
    expect(payload.given_names).toBe('')
    expect(payload.address.street_address).toBe('')
    expect(payload.address.locality).toBe('')
    expect(payload.address.province).toBe('')
    expect(payload.address.postal_code).toBe('')
  })
})

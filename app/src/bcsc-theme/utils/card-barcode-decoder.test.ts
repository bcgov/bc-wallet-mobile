import {
  BC_BCID_BARCODE_Y,
  BC_BCSC_BARCODE_C,
  BC_COMBO_BARCODE_K,
  BC_DL_BARCODE_MONONYM,
  BC_DL_BARCODE_MONONYM_NO_DOLLAR,
  BC_DL_BARCODE_MULTIWORD_LASTNAME_NO_MIDDLE,
  BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE,
  BC_DL_BARCODE_NO_DCN_A,
  BC_DL_BARCODE_NO_DCN_B,
  BC_DL_BARCODE_S,
  VALID_BC_DL_BARCODES,
} from '@/bcsc-theme/utils/__fixtures__/barcodes'
import {
  decodeCardBarcode,
  DriversLicenseMetadata,
  ScanableCode,
  toDriversLicenseMetadata,
} from '@/bcsc-theme/utils/card-barcode-decoder'

const pdf417 = (value: string): ScanableCode => ({ type: 'pdf-417', value })

const decodeLicense = (value: string): DriversLicenseMetadata => {
  const decoded = decodeCardBarcode(pdf417(value))
  if (decoded.source !== 'pdf417') {
    throw new Error(`expected ${value} to decode as a PDF-417 card, got ${decoded.source}`)
  }
  return toDriversLicenseMetadata(decoded.card)
}

describe('decodeCardBarcode', () => {
  describe('PDF-417', () => {
    it("decodes a driver's licence whose security field holds an S serial", () => {
      expect(decodeCardBarcode(pdf417(BC_DL_BARCODE_S))).toEqual({
        source: 'pdf417',
        card: expect.objectContaining({ dcn: 'S00023254', phn: null, cardNumber: '2222222' }),
      })
    })

    it('decodes a standalone BC Services Card', () => {
      expect(decodeCardBarcode(pdf417(BC_BCSC_BARCODE_C))).toEqual({
        source: 'pdf417',
        card: expect.objectContaining({ dcn: 'C00015303', phn: '9873904417' }),
      })
    })

    it('decodes a BCID', () => {
      expect(decodeCardBarcode(pdf417(BC_BCID_BARCODE_Y))).toEqual({
        source: 'pdf417',
        card: expect.objectContaining({ dcn: 'Y00023254', phn: null }),
      })
    })

    it('decodes a combo card', () => {
      expect(decodeCardBarcode(pdf417(BC_COMBO_BARCODE_K))).toEqual({
        source: 'pdf417',
        card: expect.objectContaining({ dcn: 'K00023254', phn: '9123456789' }),
      })
    })

    it.each([
      ['A', BC_DL_BARCODE_NO_DCN_A],
      ['B', BC_DL_BARCODE_NO_DCN_B],
    ])('decodes legacy card %s, whose security field holds no DCN', (_, barcode) => {
      expect(decodeCardBarcode(pdf417(barcode))).toEqual({
        source: 'pdf417',
        card: expect.objectContaining({ dcn: null, phn: '9123456789' }),
      })
    })

    it.each(VALID_BC_DL_BARCODES)('decodes every shared fixture as a PDF-417 card: %s', (barcode) => {
      expect(decodeCardBarcode(pdf417(barcode)).source).toBe('pdf417')
    })

    it('reports a damaged PDF-417 whose track 3 is cut short', () => {
      const truncated = BC_DL_BARCODE_S.replace('00S00023254?', 'S00023254?')

      expect(decodeCardBarcode(pdf417(truncated))).toEqual({ source: 'failure', reason: 'damaged' })
    })

    it.each([
      ['an AAMVA 2016 PDF-417', '@\n\u001e\rANSI 636028090002DL00410278ZV03190008DLDAQ1234567\n'],
      ['a serial read as a PDF-417', 'S00023254'],
    ])('reports %s as unsupported', (_, value) => {
      expect(decodeCardBarcode(pdf417(value))).toEqual({ source: 'failure', reason: 'unsupported' })
    })

    it.each([
      ['a number', 123],
      ['an object', {}],
    ])('reports a value that is %s as damaged without throwing', (_, value) => {
      const code = { type: 'pdf-417', value } as unknown as ScanableCode

      expect(decodeCardBarcode(code)).toEqual({ source: 'failure', reason: 'damaged' })
    })
  })

  describe('1D', () => {
    it.each([
      ['code-39', 'K12345678'],
      ['code-128', 'A06198657'],
      ['code-39', 'a12345678'],
    ] as const)('reads a %s serial %s', (type, serial) => {
      expect(decodeCardBarcode({ type, value: serial })).toEqual({ source: '1d', serial })
    })

    it('reports a code-39 value with no leading letter as unsupported', () => {
      expect(decodeCardBarcode({ type: 'code-39', value: '123456789' })).toEqual({
        source: 'failure',
        reason: 'unsupported',
      })
    })

    it.each([
      ['no value', undefined],
      ['an empty value', ''],
    ])('reports %s as damaged', (_, value) => {
      expect(decodeCardBarcode({ type: 'code-39', value })).toEqual({ source: 'failure', reason: 'damaged' })
    })
  })

  it.each([
    ['unknown', 'unknown'],
    ['qr-code', 'qr-code'],
  ] as const)('reports a %s code as unsupported', (_, type) => {
    expect(decodeCardBarcode({ type, value: 'A12345678' })).toEqual({ source: 'failure', reason: 'unsupported' })
  })
})

describe('toDriversLicenseMetadata', () => {
  it.each([
    ['A', BC_DL_BARCODE_NO_DCN_A, '1970-09-06', '2024-09-30'],
    ['B', BC_DL_BARCODE_NO_DCN_B, '1947-04-29', '2025-04-30'],
    ['S', BC_DL_BARCODE_S, '1982-01-04', '2026-01-31'],
  ])('reads licence metadata from fixture %s', (_, barcode, birthDate, expiryDate) => {
    expect(decodeLicense(barcode)).toEqual({
      isoIIN: '636028',
      licenseNumber: '2222222',
      firstName: 'test',
      middleNames: 'card',
      lastName: 'specimen',
      birthDate: new Date(birthDate),
      expiryDate: new Date(expiryDate),
      streetAddress: '910 government st',
      postalCode: 'V8W3Y8',
      city: 'victoria',
      province: 'BC',
    })
  })

  it('reads an address that fills track 1, which has no trailing ^', () => {
    expect(decodeLicense(BC_BCSC_BARCODE_C)).toEqual({
      isoIIN: '636028',
      licenseNumber: '004023964',
      firstName: 'standalone',
      middleNames: 'citz four',
      lastName: 'cpsijsit',
      birthDate: new Date('1985-04-10'),
      expiryDate: new Date('2027-04-30'),
      streetAddress: '910 government st',
      postalCode: 'V8W3Y5',
      city: 'victoria',
      province: 'BC',
    })
  })

  it('splits middle names from a multi-word last name with no middle name', () => {
    expect(decodeLicense(BC_DL_BARCODE_MULTIWORD_LASTNAME_NO_MIDDLE)).toMatchObject({
      firstName: 'anna',
      middleNames: '',
      lastName: 'van berg',
    })
  })

  it('splits middle names from a multi-word last name with a middle name', () => {
    expect(decodeLicense(BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE)).toMatchObject({
      firstName: 'maria',
      middleNames: 'elena',
      lastName: 'de la cruz',
    })
  })

  it.each([
    ['with the "$" given-names delimiter', BC_DL_BARCODE_MONONYM],
    ['without the "$" given-names delimiter', BC_DL_BARCODE_MONONYM_NO_DOLLAR],
  ])('puts a mononym %s in the last name', (_, barcode) => {
    expect(decodeLicense(barcode)).toMatchObject({ firstName: '', middleNames: '', lastName: 'cher' })
  })

  describe('layouts the previous parser misread or rejected', () => {
    const withCity = (fieldCity: string, cityLine: string, postalCode: string) =>
      BC_DL_BARCODE_S.replace('%BCVICTORIA^', `%BC${fieldCity}`)
        .replace('VICTORIA BC  V8W 3Y8', cityLine)
        .replace('0AV8W3Y8', `0A${postalCode}`)

    it('reads a residential address outside BC', () => {
      expect(decodeLicense(withCity('EDMONTON^', 'EDMONTON AB  T5J 0N3', 'T5J0N3'))).toMatchObject({
        city: 'edmonton',
        province: 'AB',
        postalCode: 'T5J0N3',
      })
    })

    it('reads a 13-character city, which has no separator', () => {
      expect(decodeLicense(withCity('PRINCE RUPERT', 'PRINCE RUPERT BC  V8J 1A1', 'V8J1A1'))).toMatchObject({
        city: 'prince rupert',
        firstName: 'test',
        lastName: 'specimen',
        streetAddress: '910 government st',
        postalCode: 'V8J1A1',
      })
    })

    it('recovers a city longer than 13 characters from the address', () => {
      expect(decodeLicense(withCity('NORTH VANCOUV', 'NORTH VANCOUVER BC  V7M 1A1', 'V7M1A1'))).toMatchObject({
        city: 'north vancouver',
        province: 'BC',
        lastName: 'specimen',
      })
    })

    it('reads a 35-character name, which has no separator', () => {
      const name = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ,$JOHN AB'

      expect(decodeLicense(BC_DL_BARCODE_S.replace('SPECIMEN,$TEST CARD^', name))).toMatchObject({
        lastName: 'abcdefghijklmnopqrstuvwxyz',
        firstName: 'john',
        middleNames: 'ab',
        streetAddress: '910 government st',
      })
    })

    it('reads a one-line address', () => {
      const barcode = BC_DL_BARCODE_S.replace('910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8', 'VICTORIA BC  V8W 3Y8')

      expect(decodeLicense(barcode)).toMatchObject({
        streetAddress: '',
        city: 'victoria',
        province: 'BC',
        postalCode: 'V8W3Y8',
      })
    })

    it('reads a two-word city', () => {
      expect(decodeLicense(withCity('PORT ALBERNI^', 'PORT ALBERNI BC  V9Y 1A1', 'V9Y1A1'))).toMatchObject({
        city: 'port alberni',
        province: 'BC',
        postalCode: 'V9Y1A1',
      })
    })

    it('reads a three-line address', () => {
      const barcode = BC_DL_BARCODE_S.replace('910 GOVERNMENT ST$VICTORIA', 'UNIT 5$910 GOVERNMENT ST$VICTORIA')

      expect(decodeLicense(barcode)).toMatchObject({
        streetAddress: 'unit 5',
        streetAddress2: '910 government st',
        city: 'victoria',
        province: 'BC',
        postalCode: 'V8W3Y8',
      })
    })

    it.each([
      ['a non-leap year', '2702', '2027-02-28'],
      ['a leap year', '2802', '2028-02-29'],
    ])('sets a Feb 29 birthday expiring in %s to the last day of February', (_, expiry, expiryDate) => {
      const license = decodeLicense(BC_DL_BARCODE_S.replace('=260119820104=', `=${expiry}19880229=`))

      expect(license.birthDate).toEqual(new Date('1988-02-29'))
      expect(license.expiryDate).toEqual(new Date(expiryDate))
    })

    it('sets the expiry to the last day of a 30-day month', () => {
      const license = decodeLicense(BC_DL_BARCODE_S.replace('=260119820104=', '=270419850410='))

      expect(license.expiryDate).toEqual(new Date('2027-04-30'))
    })
  })

  describe('century rollover', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2100-01-01'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('rolls expiry dates into the new century', () => {
      expect(decodeLicense(BC_DL_BARCODE_NO_DCN_B).expiryDate).toEqual(new Date('2125-04-30'))
    })

    it('keeps birth dates in the century they were written in', () => {
      const barcode =
        '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=250420000429=?_%0AV8W3Y8                     X160 57WHIBLU9123456789                E$!(\\0CUPXD?'

      expect(decodeLicense(barcode).birthDate).toEqual(new Date('2000-04-29'))
    })
  })
})

import { BCCardBarcode, decodeBCCardBarcode, parseDcn } from '@/bcsc-theme/utils/bc-card-barcode'
import {
  BC_DL_BARCODE_NO_DCN_A,
  BC_DL_BARCODE_NO_DCN_B,
  BC_DL_BARCODE_S,
  BC_BCSC_BARCODE_C,
  BC_DL_BARCODE_MONONYM,
  BC_DL_BARCODE_MONONYM_NO_DOLLAR,
  BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE,
} from '@/bcsc-theme/utils/__fixtures__/barcodes'

// The 11-character security field sits immediately before the closing '?'.
const withSecurityField = (barcode: string, security: string) => `${barcode.slice(0, -12)}${security}?`

const decode = (value: string): BCCardBarcode => {
  const decoded = decodeBCCardBarcode(value)
  if (!decoded) {
    throw new Error(`expected ${value} to decode`)
  }
  return decoded
}

describe('parseDcn', () => {
  it('reads a bare DCN from the 1D barcode', () => {
    expect(parseDcn('S00023254')).toBe('S00023254')
  })

  it('strips the zero padding used in the 2D barcode security field', () => {
    expect(parseDcn('00C00015303')).toBe('C00015303')
  })

  it('accepts exactly the 20 prefix letters the DCN format allows', () => {
    const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
    const accepted = letters.filter((letter) => parseDcn(`${letter}00023254`) !== null)

    expect(accepted).toEqual([...'ACEFGHJKLMNPRSTUWXYZ'])
  })

  it.each([
    ['empty', ''],
    ['legacy encoded security field', "E$''C(R2S6L"],
    ['too few digits', 'S1234567'],
    ['too many digits', 'S123456789'],
    ['lowercase prefix', 's00023254'],
    ...['B', 'D', 'I', 'O', 'Q', 'V'].map((letter) => [`excluded prefix ${letter}`, `${letter}00023254`]),
    ['non-zero padding', '12S00023254'],
  ])('returns null for %s', (_, raw) => {
    expect(parseDcn(raw)).toBeNull()
  })
})

describe('decodeBCCardBarcode', () => {
  it('decodes every field of a driver licence barcode', () => {
    expect(decodeBCCardBarcode(BC_DL_BARCODE_S)).toEqual({
      dcn: 'S00023254',
      province: 'BC',
      city: 'VICTORIA',
      surname: 'SPECIMEN',
      givenNames: 'TEST CARD',
      addressLines: ['910 GOVERNMENT ST', 'VICTORIA BC  V8W 3Y8'],
      streetAddressLines: ['910 GOVERNMENT ST'],
      isoIIN: '636028',
      cardNumber: '2222222',
      expiry: '2026-01',
      birthDate: '1982-01-04',
      postalCode: 'V8W3Y8',
      sex: 'M',
      heightCm: 185,
      weightKg: 88,
      hairColour: 'BRN',
      eyeColour: 'BLU',
      phn: null,
      cdsVersion: '0',
      jurisdictionVersion: 'A',
    })
  })

  it('decodes a standalone BC Services Card photo card', () => {
    const decoded = decode(BC_BCSC_BARCODE_C)

    expect(decoded).toMatchObject({
      dcn: 'C00015303',
      surname: 'CPSIJSIT',
      givenNames: 'STANDALONE CITZ FOUR',
      cardNumber: '004023964',
      expiry: '2027-04',
      birthDate: '1985-04-10',
      sex: 'F',
      heightCm: null,
      weightKg: null,
      hairColour: null,
      eyeColour: null,
      phn: '9873904417',
    })
  })

  it('reads an address that fills track 1 and so has no trailing caret', () => {
    expect(decode(BC_BCSC_BARCODE_C).addressLines).toEqual(['910 GOVERNMENT ST', 'VICTORIA BC V8W 3Y5'])
  })

  it.each([
    ['one-line', 'VICTORIA BC  V8W 3Y8', []],
    ['three-line', 'UNIT 5$910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8', ['UNIT 5', '910 GOVERNMENT ST']],
  ])('separates the street lines of a %s address from its city line', (_, address, streetAddressLines) => {
    const barcode = BC_DL_BARCODE_S.replace('910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8', address)

    expect(decode(barcode).streetAddressLines).toEqual(streetAddressLines)
  })

  it.each([
    ['A', BC_DL_BARCODE_NO_DCN_A, 'M', 95],
    ['B', BC_DL_BARCODE_NO_DCN_B, 'X', 57],
  ])('decodes legacy card %s whose security field holds no DCN', (_, barcode, sex, weightKg) => {
    expect(decode(barcode)).toMatchObject({
      dcn: null,
      phn: '9123456789',
      sex,
      weightKg,
    })
  })

  it.each([
    ['00K00023254', 'K00023254'],
    ['  Y00023254', 'Y00023254'],
    ['00G00023254', 'G00023254'],
  ])('reads the DCN from security field %j', (security, dcn) => {
    const barcode = withSecurityField(BC_DL_BARCODE_S, security)

    expect(decode(barcode).dcn).toBe(dcn)
  })

  it('keeps multi-word surnames and given names intact', () => {
    expect(decode(BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE)).toMatchObject({
      surname: 'DE LA CRUZ',
      givenNames: 'MARIA ELENA',
    })
  })

  it.each([
    ['with the $ separator', BC_DL_BARCODE_MONONYM],
    ['without the $ separator', BC_DL_BARCODE_MONONYM_NO_DOLLAR],
  ])('decodes a mononym %s', (_, barcode) => {
    expect(decode(barcode)).toMatchObject({ surname: 'CHER', givenNames: '' })
  })

  it('reads a 13-character city that has no terminating caret', () => {
    const barcode = BC_DL_BARCODE_S.replace('%BCVICTORIA^', '%BCPRINCE RUPERT')

    expect(decode(barcode)).toMatchObject({ city: 'PRINCE RUPERT', surname: 'SPECIMEN' })
  })

  it('recovers a truncated city from the last address line', () => {
    const barcode = BC_DL_BARCODE_S.replace('%BCVICTORIA^', '%BCNORTH VANCOUV')
      .replace('VICTORIA BC  V8W 3Y8', 'NORTH VANCOUVER BC V7M1A1')
      .replace('0AV8W3Y8', '0AV7M1A1')

    expect(decode(barcode).city).toBe('NORTH VANCOUVER')
  })

  it('takes the province from the address, which can be outside BC', () => {
    const barcode = BC_DL_BARCODE_S.replace('%BCVICTORIA^', '%BCEDMONTON^')
      .replace('VICTORIA BC  V8W 3Y8', 'EDMONTON AB  T5J 0N3')
      .replace('0AV8W3Y8', '0AT5J0N3')

    expect(decode(barcode)).toMatchObject({ province: 'AB', city: 'EDMONTON', postalCode: 'T5J0N3' })
  })

  it("falls back to track 1's province when the last address line doesn't end in the postal code", () => {
    const barcode = BC_DL_BARCODE_S.replace('VICTORIA BC  V8W 3Y8', 'EDMONTON AB  T5J 0N3')

    expect(decode(barcode).province).toBe('BC')
  })

  it('keeps the city field when the last address line names a different city', () => {
    const barcode = BC_DL_BARCODE_S.replace('%BCVICTORIA^', '%BCNORTH VANCOUV')

    expect(decode(barcode).city).toBe('NORTH VANCOUV')
  })

  it('reads a 35-character name that has no terminating caret', () => {
    const name = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ,$JOHN AB'
    const barcode = BC_DL_BARCODE_S.replace('SPECIMEN,$TEST CARD^', name)

    expect(decode(barcode)).toMatchObject({
      surname: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      givenNames: 'JOHN AB',
      addressLines: ['910 GOVERNMENT ST', 'VICTORIA BC  V8W 3Y8'],
    })
  })

  it.each([
    ['an empty value', ''],
    ['a 1D serial', 'S00023254'],
    ['a missing track 1 start sentinel', BC_DL_BARCODE_S.slice(1)],
    ['a missing track 2', BC_DL_BARCODE_S.replace(/;[^?]*\?/, '')],
    ['a truncated track 3', BC_DL_BARCODE_S.replace('00S00023254?', 'S00023254?')],
    ['an expiry month of 13', BC_DL_BARCODE_S.replace('=2601', '=2613')],
    ['a birth day of 00', BC_DL_BARCODE_S.replace('19820104', '19820100')],
  ])('returns null for %s', (_, value) => {
    expect(decodeBCCardBarcode(value)).toBeNull()
  })
})

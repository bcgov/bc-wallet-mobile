import {
  BCCardBarcode,
  BCCardType,
  decodeBCCardBarcode,
  hasBCServicesCard,
  parseDcn,
} from '@/bcsc-theme/utils/bc-card-barcode'
import {
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B,
  BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
  BC_DL_BARCODE_3_CARET,
  BC_DL_BARCODE_MONONYM,
  BC_DL_BARCODE_MONONYM_NO_DOLLAR,
  BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE,
} from '@/bcsc-theme/utils/decoder-strategy/__fixtures__/barcodes'

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
  it.each([
    ['S00023254', BCCardType.DriversLicence],
    ['R00023254', BCCardType.LearnersLicence],
    ['U00023254', BCCardType.NoviceLicence],
    ['K00023254', BCCardType.ComboDriversLicence],
    ['P00023254', BCCardType.ComboLearnersLicence],
    ['H00023254', BCCardType.ComboNoviceLicence],
    ['J00023254', BCCardType.Combo],
    ['Y00023254', BCCardType.BCID],
    ['G00023254', BCCardType.BCSCNonPhoto],
    ['F00023254', BCCardType.BCSCNonPhoto],
    ['C00023254', BCCardType.BCSCPhoto],
    ['A00023254', BCCardType.BCSCPhoto],
  ])('maps %s to %s', (raw, cardType) => {
    expect(parseDcn(raw)).toEqual({ value: raw, prefix: raw[0], cardType, checkDigit: 4 })
  })

  it('strips the zero padding used in the 2D barcode security field', () => {
    expect(parseDcn('00C00015303')).toEqual({
      value: 'C00015303',
      prefix: 'C',
      cardType: BCCardType.BCSCPhoto,
      checkDigit: 3,
    })
  })

  it('accepts exactly the 20 prefix letters the DCN format allows', () => {
    const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
    const accepted = letters.filter((letter) => parseDcn(`${letter}00023254`) !== null)

    expect(accepted).toEqual([...'ACEFGHJKLMNPRSTUWXYZ'])
  })

  it('parses an unmapped prefix as Unknown rather than rejecting it', () => {
    expect(parseDcn('Z12345678')?.cardType).toBe(BCCardType.Unknown)
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

describe('hasBCServicesCard', () => {
  it.each([
    [BCCardType.ComboDriversLicence, true],
    [BCCardType.ComboLearnersLicence, true],
    [BCCardType.ComboNoviceLicence, true],
    [BCCardType.Combo, true],
    [BCCardType.BCSCNonPhoto, true],
    [BCCardType.BCSCPhoto, true],
    [BCCardType.DriversLicence, false],
    [BCCardType.LearnersLicence, false],
    [BCCardType.NoviceLicence, false],
    [BCCardType.BCID, false],
    [BCCardType.Unknown, false],
  ])('%s -> %s', (cardType, expected) => {
    expect(hasBCServicesCard(cardType)).toBe(expected)
  })
})

describe('decodeBCCardBarcode', () => {
  it('decodes every field of a driver licence barcode', () => {
    expect(decodeBCCardBarcode(BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C)).toEqual({
      cardType: BCCardType.DriversLicence,
      dcn: { value: 'S00023254', prefix: 'S', cardType: BCCardType.DriversLicence, checkDigit: 4 },
      province: 'BC',
      city: 'VICTORIA',
      surname: 'SPECIMEN',
      givenNames: 'TEST CARD',
      addressLines: ['910 GOVERNMENT ST', 'VICTORIA BC  V8W 3Y8'],
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

  // #4699: this fixture was named as a combo card, but its DCN prefix and blank PHN mark a licence only.
  it('classifies a licence with a serial-like DCN as a licence, not a BC Services Card', () => {
    const decoded = decode(BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C)

    expect(hasBCServicesCard(decoded.cardType)).toBe(false)
  })

  it('decodes a standalone BC Services Card photo card', () => {
    const decoded = decode(BC_DL_BARCODE_3_CARET)

    expect(decoded).toMatchObject({
      cardType: BCCardType.BCSCPhoto,
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
    expect(hasBCServicesCard(decoded.cardType)).toBe(true)
  })

  it('reads an address that fills track 1 and so has no trailing caret', () => {
    expect(decode(BC_DL_BARCODE_3_CARET).addressLines).toEqual(['910 GOVERNMENT ST', 'VICTORIA BC V8W 3Y5'])
  })

  it.each([
    ['A', BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A, 'M', 95],
    ['B', BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B, 'X', 57],
  ])('decodes legacy card %s whose security field holds no DCN', (_, barcode, sex, weightKg) => {
    expect(decode(barcode)).toMatchObject({
      cardType: BCCardType.Unknown,
      dcn: null,
      phn: '9123456789',
      sex,
      weightKg,
    })
  })

  it.each([
    ['00K00023254', BCCardType.ComboDriversLicence],
    ['00Y00023254', BCCardType.BCID],
    ['00G00023254', BCCardType.BCSCNonPhoto],
  ])('takes the card type from security field %s', (security, cardType) => {
    const barcode = withSecurityField(BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C, security)

    expect(decode(barcode).cardType).toBe(cardType)
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
    const barcode = BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('%BCVICTORIA^', '%BCPRINCE RUPERT')

    expect(decode(barcode)).toMatchObject({ city: 'PRINCE RUPERT', surname: 'SPECIMEN' })
  })

  it('reads a 35-character name that has no terminating caret', () => {
    const name = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ,$JOHN AB'
    const barcode = BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('SPECIMEN,$TEST CARD^', name)

    expect(decode(barcode)).toMatchObject({
      surname: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      givenNames: 'JOHN AB',
      addressLines: ['910 GOVERNMENT ST', 'VICTORIA BC  V8W 3Y8'],
    })
  })

  it.each([
    ['an empty value', ''],
    ['a 1D serial', 'S00023254'],
    ['a missing track 1 start sentinel', BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.slice(1)],
    ['a missing track 2', BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace(/;[^?]*\?/, '')],
    ['a truncated track 3', BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('00S00023254?', 'S00023254?')],
    ['an expiry month of 13', BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('=2601', '=2613')],
    ['a birth day of 00', BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('19820104', '19820100')],
  ])('returns null for %s', (_, value) => {
    expect(decodeBCCardBarcode(value)).toBeNull()
  })
})

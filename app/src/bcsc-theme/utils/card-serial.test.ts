import { parseDcn, parseLooseSerial } from '@/bcsc-theme/utils/card-serial'

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

describe('parseLooseSerial', () => {
  it.each([
    ['A12345678', '1 letter followed by 8 digits'],
    ['AB1234567', 'multiple letters followed by digits'],
    ['a12345678', 'lowercase letter followed by digits'],
    ['ABC1234', 'multiple letters and digits'],
  ])('returns %s unchanged (%s)', (serial) => {
    expect(parseLooseSerial(serial)).toBe(serial)
  })

  it.each([
    ['123456789', 'no leading letter'],
    ['A1234@678', 'special characters'],
    ['A1234567890', 'too long'],
    ['', 'empty serial'],
    ['ABCDEFGH', 'only letters'],
    ['12345678', 'only digits'],
  ])('returns null for %s (%s)', (serial) => {
    expect(parseLooseSerial(serial)).toBeNull()
  })

  // Records where the two rules disagree, so tightening the 1D rule to parseDcn is a visible change.
  describe('against parseDcn', () => {
    it.each([
      ['C2644539', 'a recorded Code 39 misread of C26444539'],
      ['a12345678', 'a lowercase prefix'],
      ['AB1234567', 'two prefix letters'],
      ['B12345678', 'a prefix letter no DCN uses'],
    ])('accepts %s, which parseDcn rejects (%s)', (serial) => {
      expect(parseLooseSerial(serial)).toBe(serial)
      expect(parseDcn(serial)).toBeNull()
    })

    it.each([
      ['00S00023254', 'zero-padded, as in the 2D security field'],
      [' S00023254', 'a leading space'],
    ])('rejects %j, which parseDcn accepts (%s)', (serial) => {
      expect(parseLooseSerial(serial)).toBeNull()
      expect(parseDcn(serial)).toBe('S00023254')
    })
  })
})

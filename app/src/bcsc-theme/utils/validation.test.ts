import {
  EMAIL_MAX_LENGTH,
  emailSchema,
  firstErrorKey,
  firstNameSchema,
  lastNameSchema,
  middleNamesSchema,
  parseField,
  postalCodeSchema,
  serialSchema,
} from '@/bcsc-theme/utils/validation'

describe('validation', () => {
  describe('postalCodeSchema', () => {
    it('accepts real postal codes in any casing, with or without a separator', () => {
      const valid = [
        'A1B 2C3',
        'K1A 0B1',
        'V6B 1A1',
        'H2Y 1N4',
        'T5J 1N9',
        'R3C 4T3',
        'X0A 1H0',
        'Y1A 5B2',
        'A1B2C3',
        'a1b 2c3',
        'a1b2c3',
        'A1B-2C3',
        'a1B-2c3',
        'A1b 2C3',
      ]

      for (const postalCode of valid) {
        expect(firstErrorKey(postalCodeSchema, postalCode)).toBeNull()
      }
    })

    it('rejects letters Canada Post never issues', () => {
      // D, F, I, O, Q and U are excluded everywhere; W and Z additionally cannot lead.
      const invalid = ['D1A1A1', 'F1A1A1', 'I1A1A1', 'O1A1A1', 'Q1A1A1', 'U1A1A1', 'W1A1A1', 'Z1A1A1']

      for (const postalCode of invalid) {
        expect(firstErrorKey(postalCodeSchema, postalCode)).toBe('BCSC.Address.PostalCodeInvalid')
      }

      // Excluded letters in the trailing positions too
      expect(firstErrorKey(postalCodeSchema, 'A1D 2C3')).toBe('BCSC.Address.PostalCodeInvalid')
      expect(firstErrorKey(postalCodeSchema, 'A1B 2O3')).toBe('BCSC.Address.PostalCodeInvalid')
    })

    it('rejects malformed postal codes', () => {
      const invalid = [
        '123 456',
        'ABC DEF',
        'A1B2C',
        'A1B 2C34',
        'A1B-2C34',
        'A1B_2C3',
        'A1 2C3',
        '1A1 2C3',
        'A11 2C3',
        'A1A 22C3',
        'A1A 2CC3',
        '',
        ' ',
        'A B C D E F',
        'A-1B-2C-3',
        'A1B@2C3',
      ]

      for (const postalCode of invalid) {
        expect(firstErrorKey(postalCodeSchema, postalCode)).toBe('BCSC.Address.PostalCodeInvalid')
      }
    })

    it('ignores surrounding whitespace', () => {
      expect(firstErrorKey(postalCodeSchema, 'A1A2C3 ')).toBeNull()
      expect(firstErrorKey(postalCodeSchema, ' A1A2C3')).toBeNull()
    })
  })

  describe('emailSchema', () => {
    it('accepts the addresses issue #4145 reported as wrongly rejected', () => {
      const valid = [
        'jane@mail.some-company.com', // hyphen in a non-leading domain label
        'jane.doe+tag@example.com', // plus-addressing after a dot in the local part
        'jane.doe%x@example.com', // percent in the local part
        'user@example.com ', // trailing space from keyboard autocomplete
      ]

      for (const email of valid) {
        expect(firstErrorKey(emailSchema, email)).toBeNull()
      }
    })

    it('accepts ordinary addresses', () => {
      const valid = [
        'a@b.io',
        'jane@some-company.com',
        'jane.doe@sub.domain.co.uk',
        'name@host.museum',
        'first_last@example.com', // underscores, which the previous regex also allowed
      ]

      for (const email of valid) {
        expect(firstErrorKey(emailSchema, email)).toBeNull()
      }
    })

    it('rejects malformed addresses', () => {
      const invalid = ['', '   ', 'invalidemail', 'name@host', 'user@host.com1', 'user@.com', 'jane@@example.com']

      for (const email of invalid) {
        expect(firstErrorKey(emailSchema, email)).toBe('BCSC.EmailConfirmation.EmailError')
      }
    })

    it('rejects addresses beyond the RFC length limit', () => {
      const tooLong = `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`

      expect(firstErrorKey(emailSchema, tooLong)).toBe('BCSC.EmailConfirmation.EmailError')
    })

    it('parses to the trimmed, lower-cased address that gets submitted', () => {
      const result = parseField(emailSchema, '  Jane.Doe+Tag@Example.COM ')

      expect(result).toEqual({ ok: true, value: 'jane.doe+tag@example.com' })
    })
  })

  describe('serialSchema', () => {
    it('accepts 3 to 15 alphanumeric characters', () => {
      expect(firstErrorKey(serialSchema, 'ABC')).toBeNull()
      expect(firstErrorKey(serialSchema, 'A12345678')).toBeNull() // the usual BCSC shape
      expect(firstErrorKey(serialSchema, 'A1B2C3D4E5F6G7H')).toBeNull()
      expect(firstErrorKey(serialSchema, 'abc123')).toBeNull()
    })

    it('does not require a leading letter, so manual entry stays the fallback path', () => {
      expect(firstErrorKey(serialSchema, '123')).toBeNull()
      expect(firstErrorKey(serialSchema, '1ABC')).toBeNull()
    })

    it('reports an empty serial as required', () => {
      expect(firstErrorKey(serialSchema, '')).toBe('BCSC.ManualSerial.EmptySerialError')
      expect(firstErrorKey(serialSchema, '   ')).toBe('BCSC.ManualSerial.EmptySerialError')
    })

    it('rejects serials that are too short, too long, or non-alphanumeric', () => {
      expect(firstErrorKey(serialSchema, 'AB')).toBe('BCSC.ManualSerial.FormatError')
      expect(firstErrorKey(serialSchema, 'A1B2C3D4E5F6G7H8')).toBe('BCSC.ManualSerial.FormatError')
      expect(firstErrorKey(serialSchema, 'ABC-123')).toBe('BCSC.ManualSerial.FormatError')
      expect(firstErrorKey(serialSchema, 'ABC 123')).toBe('BCSC.ManualSerial.FormatError')
    })
  })

  describe('name schemas', () => {
    it('allows an empty first name so mononyms can proceed', () => {
      expect(firstErrorKey(firstNameSchema, '')).toBeNull()
    })

    it('caps the first name at 15 characters', () => {
      expect(firstErrorKey(firstNameSchema, 'A'.repeat(15))).toBeNull()
      expect(firstErrorKey(firstNameSchema, 'A'.repeat(16))).toBe('BCSC.EvidenceIDCollection.FirstNameLengthError')
    })

    it('requires a last name and caps it at 35 characters', () => {
      expect(firstErrorKey(lastNameSchema, '')).toBe('BCSC.EvidenceIDCollection.LastNameError')
      expect(firstErrorKey(lastNameSchema, '   ')).toBe('BCSC.EvidenceIDCollection.LastNameError')
      expect(firstErrorKey(lastNameSchema, 'A'.repeat(35))).toBeNull()
      expect(firstErrorKey(lastNameSchema, 'A'.repeat(36))).toBe('BCSC.EvidenceIDCollection.LastNameLengthError')
    })

    it('caps middle names at 30 characters and two names', () => {
      expect(firstErrorKey(middleNamesSchema, '')).toBeNull()
      expect(firstErrorKey(middleNamesSchema, 'Jane Alex')).toBeNull()
      expect(firstErrorKey(middleNamesSchema, 'Jane Alex Robin')).toBe('BCSC.EvidenceIDCollection.MiddleNamesError')
      expect(firstErrorKey(middleNamesSchema, 'A'.repeat(31))).toBe('BCSC.EvidenceIDCollection.MiddleNamesLengthError')
    })

    it('accepts names with accents and punctuation', () => {
      // ias-ios rejects these via its ASCII-only isValidName; deliberately not carried over.
      expect(firstErrorKey(firstNameSchema, 'Émile')).toBeNull()
      expect(firstErrorKey(lastNameSchema, "O'Brien-Nuñez")).toBeNull()
    })
  })
})

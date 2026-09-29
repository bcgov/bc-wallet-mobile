import { DriversLicenseBarcode, ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { DriversLicenseBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/DriversLicenseBarcodeDecoder'
import {
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B,
  BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
  BC_DL_BARCODE_3_CARET,
  BC_DL_BARCODE_MONONYM,
  BC_DL_BARCODE_MONONYM_NO_DOLLAR,
  BC_DL_BARCODE_MULTIWORD_LASTNAME_NO_MIDDLE,
  BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE,
  VALID_BC_DL_BARCODES,
} from '@/bcsc-theme/utils/decoder-strategy/__fixtures__/barcodes'

describe('DriversLicenseBarcodeDecoder', () => {
  describe('canDecode', () => {
    it.each(VALID_BC_DL_BARCODES)('should return true for a PDF-417 barcode: %s', (validBarcode) => {
      const decoder = new DriversLicenseBarcodeDecoder()

      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: validBarcode,
      }

      expect(decoder.canDecode(barcode)).toBe(true)
    })

    it('should return false for a non PDF-417 barcode', () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: ScanableCode = {
        type: 'unknown',
        value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
      }

      expect(decoder.canDecode(barcode)).toBe(false)
    })

    it('should return false for a malformed PDF-417 barcode', () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: 'MALFORMED_BARCODE_DATA',
      }

      expect(decoder.canDecode(barcode)).toBe(false)
    })
  })

  describe('decode', () => {
    it("should correctly decode a valid BC Driver's License barcode (A)", () => {
      const decoder = new DriversLicenseBarcodeDecoder()

      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded).toEqual({
        kind: 'DriversLicenseBarcode',
        isoIIN: '636028',
        licenseNumber: '2222222',
        firstName: 'test',
        middleNames: 'card',
        lastName: 'specimen',
        birthDate: new Date('1970-09-06'),
        expiryDate: new Date('2024-09-30'),
        streetAddress: '910 government st',
        postalCode: 'V8W3Y8',
        city: 'victoria',
        province: 'BC',
      })
    })

    it("should correctly decode a valid BC Driver's License barcode (B)", () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded).toEqual({
        kind: 'DriversLicenseBarcode',
        isoIIN: '636028',
        licenseNumber: '2222222',
        firstName: 'test',
        middleNames: 'card',
        lastName: 'specimen',
        birthDate: new Date('1947-04-29'),
        expiryDate: new Date('2025-04-30'),
        streetAddress: '910 government st',
        postalCode: 'V8W3Y8',
        city: 'victoria',
        province: 'BC',
      })
    })

    it("should correctly decode a valid BC Driver's License barcode with BCSC serial", () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded).toEqual({
        kind: 'DriversLicenseBarcode',
        isoIIN: '636028',
        licenseNumber: '2222222',
        firstName: 'test',
        middleNames: 'card',
        lastName: 'specimen',
        birthDate: new Date('1982-01-04'),
        expiryDate: new Date('2026-01-31'),
        streetAddress: '910 government st',
        postalCode: 'V8W3Y8',
        city: 'victoria',
        province: 'BC',
      })
    })

    it('should throw an error when decoding a barcode that cannot be decoded', () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: 'MALFORMED_BARCODE_DATA',
      }

      expect(() => decoder.decode(barcode)).toThrow()
    })

    it('should correctly decode a 3-caret format barcode (no extra ^ before track separator)', () => {
      const decoder = new DriversLicenseBarcodeDecoder()

      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_3_CARET,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded).toEqual({
        kind: 'DriversLicenseBarcode',
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

    it('correctly splits middleNames from a multi-word last name with no middle name', () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_MULTIWORD_LASTNAME_NO_MIDDLE,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded.firstName).toBe('anna')
      expect(decoded.middleNames).toBe('')
      expect(decoded.lastName).toBe('van berg')
    })

    it('correctly splits middleNames from a multi-word last name with a middle name', () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded.firstName).toBe('maria')
      expect(decoded.middleNames).toBe('elena')
      expect(decoded.lastName).toBe('de la cruz')
    })

    it('handles a mononym (empty first name and middle names, full name in lastName)', () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_MONONYM,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded.firstName).toBe('')
      expect(decoded.middleNames).toBe('')
      expect(decoded.lastName).toBe('cher')
    })

    it('handles a mononym even if the "$" given-names delimiter is missing entirely', () => {
      const decoder = new DriversLicenseBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_DL_BARCODE_MONONYM_NO_DOLLAR,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded.firstName).toBe('')
      expect(decoded.middleNames).toBe('')
      expect(decoded.lastName).toBe('cher')
    })

    // #4771: layouts the previous parser misread or rejected.
    describe('spec edge cases', () => {
      const decode = (value: string) => {
        const decoder = new DriversLicenseBarcodeDecoder()
        const barcode: DriversLicenseBarcode = { type: 'pdf-417', value }

        expect(decoder.canDecode(barcode)).toBe(true)
        return decoder.decode(barcode)
      }

      const withCity = (fieldCity: string, cityLine: string, postalCode: string) =>
        BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('%BCVICTORIA^', `%BC${fieldCity}`)
          .replace('VICTORIA BC  V8W 3Y8', cityLine)
          .replace('0AV8W3Y8', `0A${postalCode}`)

      it('reads a 13-character city, which has no separator', () => {
        const decoded = decode(withCity('PRINCE RUPERT', 'PRINCE RUPERT BC  V8J 1A1', 'V8J1A1'))

        expect(decoded).toMatchObject({
          city: 'prince rupert',
          firstName: 'test',
          lastName: 'specimen',
          streetAddress: '910 government st',
          postalCode: 'V8J1A1',
        })
      })

      it('recovers a city longer than 13 characters from the address', () => {
        const decoded = decode(withCity('NORTH VANCOUV', 'NORTH VANCOUVER BC  V7M 1A1', 'V7M1A1'))

        expect(decoded).toMatchObject({ city: 'north vancouver', province: 'BC', lastName: 'specimen' })
      })

      it('reads a 35-character name, which has no separator', () => {
        const name = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ,$JOHN AB'
        const decoded = decode(BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('SPECIMEN,$TEST CARD^', name))

        expect(decoded).toMatchObject({
          lastName: 'abcdefghijklmnopqrstuvwxyz',
          firstName: 'john',
          middleNames: 'ab',
          streetAddress: '910 government st',
        })
      })

      it('reads a one-line address', () => {
        const decoded = decode(
          BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8', 'VICTORIA BC  V8W 3Y8')
        )

        expect(decoded).toMatchObject({ streetAddress: '', city: 'victoria', province: 'BC', postalCode: 'V8W3Y8' })
      })

      it('reads a two-word city', () => {
        const decoded = decode(withCity('PORT ALBERNI^', 'PORT ALBERNI BC  V9Y 1A1', 'V9Y1A1'))

        expect(decoded).toMatchObject({ city: 'port alberni', province: 'BC', postalCode: 'V9Y1A1' })
      })

      it('reads a three-line address', () => {
        const decoded = decode(
          BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace(
            '910 GOVERNMENT ST$VICTORIA',
            'UNIT 5$910 GOVERNMENT ST$VICTORIA'
          )
        )

        expect(decoded).toMatchObject({
          streetAddress: 'unit 5',
          streetAddress2: '910 government st',
          city: 'victoria',
          province: 'BC',
          postalCode: 'V8W3Y8',
        })
      })

      it('sets the expiry to the last day of the month for a Feb 29 birthday', () => {
        const decoded = decode(BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C.replace('=260119820104=', '=270219880229='))

        expect(decoded.birthDate).toEqual(new Date('1988-02-29'))
        expect(decoded.expiryDate).toEqual(new Date('2027-02-28'))
      })
    })

    describe('century rollover', () => {
      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2100-01-01'))
      })

      afterEach(() => {
        jest.useRealTimers()
      })

      it('should handle century rollover edge case for expiry dates', () => {
        const decoder = new DriversLicenseBarcodeDecoder()
        const barcode: DriversLicenseBarcode = {
          type: 'pdf-417',
          value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B,
        }

        const decoded = decoder.decode(barcode)

        expect(decoded.expiryDate).toEqual(new Date('2125-04-30'))
      })

      it('should handle century rollover edge case for birth dates', () => {
        const decoder = new DriversLicenseBarcodeDecoder()
        const barcode: DriversLicenseBarcode = {
          type: 'pdf-417',
          value:
            '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=250420000429=?_%0AV8W3Y8                     X160 57WHIBLU9123456789                E$!(\\0CUPXD?',
        }

        const decoded = decoder.decode(barcode)

        expect(decoded.birthDate).toEqual(new Date('2000-04-29'))
      })
    })
  })
})

import { DriversLicenseBarcode, ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { DriversLicenseBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/DriversLicenseBarcodeDecoder'

const BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A =
  "%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"
const BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=250419470429=?_%0AV8W3Y8                     X160 57WHIBLU9123456789                E$!(\\0CUPXD?'
const BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_A =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU                          00S00023254?'

const VALID_BC_DL_BARCODES = [
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B,
  BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_A,
]

describe('DriversLicenseBarcodeDecoder', () => {
  describe('canDecode', () => {
    it('should return true for a PDF-417 barcode', () => {
      const decoder = new DriversLicenseBarcodeDecoder()

      for (const validBarcode of VALID_BC_DL_BARCODES) {
        const barcode: DriversLicenseBarcode = {
          type: 'pdf-417',
          value: validBarcode,
        }
        expect(decoder.canDecode(barcode)).toBe(true)
      }
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
        licenseNumber: '2222222',
        firstName: 'test',
        middleNames: 'card',
        lastName: 'specimen',
        birthDate: new Date('1970-09-06'),
        expiryDate: new Date('2024-09-06'),
        streetAddress: '910 government st',
        postalCode: 'V8W 3Y8',
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
        licenseNumber: '9123456789',
        firstName: 'test',
        middleNames: 'card',
        lastName: 'specimen',
        birthDate: new Date('1947-04-19'),
        expiryDate: new Date('2020-04-29'),
        streetAddress: '910 government st',
        postalCode: 'V8W 3Y8',
        city: 'victoria',
        province: 'BC',
      })
    })
  })
})

import { BCComboCardBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/BCComboCardBarcodeDecoder'
import { DriversLicenseBarcode, ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { DriversLicenseBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/DriversLicenseBarcodeDecoder'

const BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A =
  "%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"
const BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=250419470429=?_%0AV8W3Y8                     X160 57WHIBLU9123456789                E$!(\\0CUPXD?'
const BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU                          00S00023254?'

describe('BCComboCardBarcodeDecoder', () => {
  describe('canDecode', () => {
    it('should return true for a PDF-417 barcode', () => {
      const decoder = new BCComboCardBarcodeDecoder()

      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
      }

      expect(decoder.canDecode(barcode)).toBe(true)
    })

    it('should return false for a non PDF-417 barcode', () => {
      const decoder = new BCComboCardBarcodeDecoder()
      const barcode: ScanableCode = {
        type: 'unknown',
        value: BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
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

    it('should return false for a drivers license barcode that does not include bcsc serial', () => {
      const decoder = new BCComboCardBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
      }

      expect(decoder.canDecode(barcode)).toBe(false)

      const barcodeB: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B,
      }

      expect(decoder.canDecode(barcodeB)).toBe(false)
    })
  })

  describe('decode', () => {
    it("should correctly decode a valid BC Combo BCSC and Driver's License barcode (C)", () => {
      const decoder = new BCComboCardBarcodeDecoder()

      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
      }

      const decoded = decoder.decode(barcode)

      expect(decoded).toEqual({
        kind: 'BCServicesComboCardCardBarcode',
        bcscSerial: 'S00023254',
        licenseNumber: '2222222',
        firstName: 'test',
        middleNames: 'card',
        lastName: 'specimen',
        birthDate: new Date('1982-01-04'),
        expiryDate: new Date('2026-01-04'),
        streetAddress: '910 government st',
        postalCode: 'V8W 3Y8',
        city: 'victoria',
        province: 'BC',
      })
    })

    it('should throw an error when trying to decode a malformed BC Combo card barcode', () => {
      const decoder = new BCComboCardBarcodeDecoder()
      const barcode: DriversLicenseBarcode = {
        type: 'pdf-417',
        value: 'MALFORMED_BARCODE_DATA',
      }

      expect(() => decoder.decode(barcode)).toThrow()
    })
  })
})

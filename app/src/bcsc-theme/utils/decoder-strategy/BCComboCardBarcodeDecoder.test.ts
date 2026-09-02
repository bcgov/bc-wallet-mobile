import { BCComboCardBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/BCComboCardBarcodeDecoder'
import { DriversLicenseBarcode, ScanableCode } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import {
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B,
  BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
} from '@/bcsc-theme/utils/decoder-strategy/__fixtures__/barcodes'

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
      const decoder = new BCComboCardBarcodeDecoder()
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
        isoIIN: '636028',
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

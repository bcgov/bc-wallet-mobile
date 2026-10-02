import { BCServicesCardBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/BCServicesCardBarcodeDecoder'
import {
  BCServicesCardBarcode,
  DecodedCodeKind,
  ScanableCode,
} from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'

describe('BCServicesCardBarcodeDecoder', () => {
  describe('canDecode', () => {
    it('should return true for a valid BCSC serial Code 128 barcode', () => {
      const decoder = new BCServicesCardBarcodeDecoder()
      const barcode: BCServicesCardBarcode = {
        type: 'code-128',
        value: 'A12345678',
      }

      expect(decoder.canDecode(barcode)).toBe(true)
    })
    it('should return true for a valid BCSC serial Code 39 barcode', () => {
      const decoder = new BCServicesCardBarcodeDecoder()
      const barcode: BCServicesCardBarcode = {
        type: 'code-39',
        value: 'A12345678',
      }

      expect(decoder.canDecode(barcode)).toBe(true)
    })

    it('should return false for a Code 39 barcode with an invalid BCSC serial', () => {
      const decoder = new BCServicesCardBarcodeDecoder()
      const barcode: BCServicesCardBarcode = {
        type: 'code-39',
        value: '123456789', // Missing leading letter
      }

      expect(decoder.canDecode(barcode)).toBe(false)
    })

    it('should return false for a non Code 39 barcode', () => {
      const decoder = new BCServicesCardBarcodeDecoder()
      const barcode: ScanableCode = {
        type: 'unknown',
        value: 'A12345678',
      }

      expect(decoder.canDecode(barcode)).toBe(false)
    })
  })

  describe('decode', () => {
    it('should correctly decode a valid BCSC serial Code 39 barcode', () => {
      const decoder = new BCServicesCardBarcodeDecoder()
      const barcode: BCServicesCardBarcode = {
        type: 'code-39',
        value: 'A12345678',
      }

      const decoded = decoder.decode(barcode)
      expect(decoded).toEqual({ kind: DecodedCodeKind.BCServicesCardBarcode, bcscSerial: 'A12345678' })
    })

    it('should throw an error when trying to decode an invalid BCSC serial', () => {
      const decoder = new BCServicesCardBarcodeDecoder()
      const barcode: BCServicesCardBarcode = {
        type: 'code-39',
        value: '123456789', // Missing leading letter
      }

      expect(() => decoder.decode(barcode)).toThrow()
    })
  })
})

import {
  BCServicesCardBarcodeDecoder,
  isBCSCSerial,
} from '@/bcsc-theme/utils/decoder-strategy/BCServicesCardBarcodeDecoder'
import {
  BCServicesCardBarcode,
  DecodedCodeKind,
  ScanableCode,
} from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'

describe('BCServicesCardBarcodeDecoder', () => {
  describe('isBCSCSerial', () => {
    it.each([
      ['A12345678', true, '1 letter followed by 8 digits'],
      ['AB1234567', true, 'multiple letters followed by digits'],
      ['a12345678', true, 'lowercase letter followed by digits'],
      ['ABC1234', true, 'multiple letters and digits'],
      ['123456789', false, 'no leading letter'],
      ['A1234@678', false, 'special characters'],
      ['A1234567890', false, 'too long'],
      ['', false, 'empty serial'],
      ['ABCDEFGH', false, 'only letters'],
      ['12345678', false, 'only digits'],
    ])('isBCSCSerial(%s) -> %s (%s)', (serial, expected) => {
      expect(isBCSCSerial(serial)).toBe(expected)
    })
  })
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

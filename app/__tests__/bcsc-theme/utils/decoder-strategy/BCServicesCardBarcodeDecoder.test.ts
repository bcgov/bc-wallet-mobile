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
    describe('returns true for valid BCSC serials', () => {
      it('should validate serial with 1 letter followed by 8 digits', () => {
        expect(isBCSCSerial('A12345678')).toBe(true)
      })

      it('should validate serial with multiple letters followed by digits', () => {
        expect(isBCSCSerial('AB1234567')).toBe(true)
      })

      it('should validate serial with lowercase letter followed by digits', () => {
        expect(isBCSCSerial('a12345678')).toBe(true)
      })

      it('should validate serial with multiple letters and digits', () => {
        expect(isBCSCSerial('ABC1234')).toBe(true)
      })
    })

    describe('returns false for invalid BCSC serials', () => {
      it('should invalidate serial without leading letter', () => {
        expect(isBCSCSerial('123456789')).toBe(false)
      })

      it('should invalidate serial with special characters', () => {
        expect(isBCSCSerial('A1234@678')).toBe(false)
      })

      it('should invalidate serial that is too long', () => {
        expect(isBCSCSerial('A1234567890')).toBe(false)
      })

      it('should invalidate empty serial', () => {
        expect(isBCSCSerial('')).toBe(false)
      })

      it('should invalidate serial with only letters', () => {
        expect(isBCSCSerial('ABCDEFGH')).toBe(false)
      })

      it('should invalidate serial with only digits', () => {
        expect(isBCSCSerial('12345678')).toBe(false)
      })
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

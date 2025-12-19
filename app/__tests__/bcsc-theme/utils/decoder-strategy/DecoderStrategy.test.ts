import { BCComboCardBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/BCComboCardBarcodeDecoder'
import { BCServicesCardBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/BCServicesCardBarcodeDecoder'
import {
  decodeScannedCode,
  getDecoderStrategies,
  ScanableCode,
} from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { DriversLicenseBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/DriversLicenseBarcodeDecoder'

describe('getDecoderStrategies', () => {
  it('should return an array of decoder strategies', () => {
    const strategies = getDecoderStrategies()

    expect(strategies).toHaveLength(3)
  })

  it('should return strategies in the correct order', () => {
    const strategies = getDecoderStrategies()
    expect(strategies[0]).toBeInstanceOf(BCComboCardBarcodeDecoder)
    expect(strategies[1]).toBeInstanceOf(DriversLicenseBarcodeDecoder)
    expect(strategies[2]).toBeInstanceOf(BCServicesCardBarcodeDecoder)
    expect(strategies).toHaveLength(3)
  })
})

describe('decodeScannedCode', () => {
  it('should decode using the strategy', () => {
    const mockStrategy = {
      canDecode: jest.fn().mockReturnValue(true),
      decode: jest.fn().mockReturnValue(true),
    }

    const mockCode: ScanableCode = {
      type: 'unknown',
      value: 'mock-value',
    }

    const value = decodeScannedCode(mockCode, [mockStrategy])

    expect(mockStrategy.canDecode).toHaveBeenCalledWith(mockCode)
    expect(mockStrategy.decode).toHaveBeenCalledWith(mockCode)
    expect(value).toBe(true)
  })

  it('should return null if no strategy can decode the code', () => {
    const mockStrategy = {
      canDecode: jest.fn().mockReturnValue(false),
      decode: jest.fn(),
    }

    const mockCode: ScanableCode = {
      type: 'unknown',
      value: 'mock-value',
    }

    const value = decodeScannedCode(mockCode, [mockStrategy])

    expect(mockStrategy.canDecode).toHaveBeenCalledWith(mockCode)
    expect(mockStrategy.decode).not.toHaveBeenCalled()
    expect(value).toBeNull()
  })
})

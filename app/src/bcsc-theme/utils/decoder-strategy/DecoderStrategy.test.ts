import { BCComboCardBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/BCComboCardBarcodeDecoder'
import { BCServicesCardBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/BCServicesCardBarcodeDecoder'
import {
  decodeBarcodes,
  DecodedCode,
  DecodedCodeKind,
  DecoderStrategy,
  decodeScannedCode,
  getDecoderStrategies,
  ScanableCode,
} from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { DriversLicenseBarcodeDecoder } from '@/bcsc-theme/utils/decoder-strategy/DriversLicenseBarcodeDecoder'
import { MockLogger } from '@bifold/core'

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

const makeStrategy = (canDecode: boolean, decode: () => DecodedCode): DecoderStrategy => ({
  canDecode: jest.fn().mockReturnValue(canDecode),
  decode: jest.fn(decode),
})

describe('decodeScannedCode', () => {
  const mockCode: ScanableCode = {
    type: 'unknown',
    value: 'mock-value',
  }

  it('should decode using the strategy', () => {
    const decoded = { kind: DecodedCodeKind.BCServicesCardBarcode, bcscSerial: 'A12345678' } as DecodedCode
    const mockStrategy = makeStrategy(true, () => decoded)

    const value = decodeScannedCode(mockCode, new MockLogger(), [mockStrategy])

    expect(mockStrategy.canDecode).toHaveBeenCalledWith(mockCode)
    expect(mockStrategy.decode).toHaveBeenCalledWith(mockCode)
    expect(value).toBe(decoded)
  })

  it('should return null if no strategy can decode the code', () => {
    const mockStrategy = makeStrategy(false, () => {
      throw new Error('should not be reached')
    })

    const value = decodeScannedCode(mockCode, new MockLogger(), [mockStrategy])

    expect(mockStrategy.canDecode).toHaveBeenCalledWith(mockCode)
    expect(mockStrategy.decode).not.toHaveBeenCalled()
    expect(value).toBeNull()
  })

  it('should fall through to the next strategy when a matching strategy throws', () => {
    const decoded = { kind: DecodedCodeKind.BCServicesCardBarcode, bcscSerial: 'A12345678' } as DecodedCode
    const throwingStrategy = makeStrategy(true, () => {
      throw new Error('bad parse')
    })
    const succeedingStrategy = makeStrategy(true, () => decoded)
    const logger = new MockLogger()

    const value = decodeScannedCode(mockCode, logger, [throwingStrategy, succeedingStrategy])

    expect(value).toBe(decoded)
    expect(logger.warn).toHaveBeenCalledWith('Error decoding unknown barcode', { error: expect.any(Error) })
  })

  it('should return null when every matching strategy throws', () => {
    const throwingStrategy = makeStrategy(true, () => {
      throw new Error('bad parse')
    })
    const logger = new MockLogger()

    expect(decodeScannedCode(mockCode, logger, [throwingStrategy])).toBeNull()
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })
})

describe('decodeBarcodes', () => {
  it('should skip codes of unknown type without adding an entry', () => {
    const logger = new MockLogger()

    const result = decodeBarcodes([{ type: 'unknown', value: 'A12345678' }], logger)

    expect(result).toEqual([])
    expect(logger.debug).toHaveBeenCalledWith('[DecodeBarcodes] Skipping unknown barcode')
  })

  it('should push null for a code no strategy can decode', () => {
    const logger = new MockLogger()

    const result = decodeBarcodes([{ type: 'code-39', value: 'not-a-serial' }], logger)

    expect(result).toEqual([null])
    expect(logger.debug).toHaveBeenCalledWith('[DecodeBarcodes] Failed to decode barcode', {
      barcode: { type: 'code-39', value: 'not-a-serial' },
    })
  })

  it('should decode each supported code and preserve order', () => {
    const logger = new MockLogger()

    const result = decodeBarcodes(
      [
        { type: 'code-39', value: 'A12345678' },
        { type: 'unknown', value: 'ignored' },
        { type: 'code-128', value: 'not-a-serial' },
      ],
      logger
    )

    expect(result).toEqual([{ kind: DecodedCodeKind.BCServicesCardBarcode, bcscSerial: 'A12345678' }, null])
  })
})

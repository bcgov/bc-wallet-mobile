import {
  BCServicesCardBarcode,
  BCServicesCardDecodedBarcode,
  DecodedCodeKind,
  DecoderStrategy,
  ScanableCode,
} from './DecoderStrategy'

/**
 * Decoder for BC Services Card barcodes (Code 39)
 */
export class BCServicesCardBarcodeDecoder implements DecoderStrategy {
  canDecode(barcode: ScanableCode): barcode is BCServicesCardBarcode {
    return (
      barcode.type === 'code-39' &&
      typeof barcode.value === 'string' &&
      // BCSC serials start with a letter followed by numbers
      /^[A-Za-z][0-9]+$/.test(barcode.value)
    )
  }

  decode(barcode: BCServicesCardBarcode): BCServicesCardDecodedBarcode {
    return {
      kind: DecodedCodeKind.BCServicesCardBarcode,
      bcscSerial: barcode.value,
    }
  }
}

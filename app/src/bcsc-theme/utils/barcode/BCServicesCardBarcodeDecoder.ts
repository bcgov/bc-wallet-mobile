import {
  Barcode,
  BarcodeDecoderStrategy,
  BCServicesCardBarcode,
  BCServicesCardDecodedBarcode,
  DecodedBarcodeKind,
} from './barcode-decoder-strategy'

/**
 * Decoder for BC Services Card barcodes (Code 39)
 */
export class BCServicesCardBarcodeDecoder implements BarcodeDecoderStrategy {
  canDecode(barcode: Barcode): barcode is BCServicesCardBarcode {
    return (
      barcode.type === 'code-39' &&
      typeof barcode.value === 'string' &&
      // BCSC serials start with a letter followed by numbers
      /^[A-Za-z][0-9]+$/.test(barcode.value)
    )
  }

  decodeBarcode(barcode: BCServicesCardBarcode): BCServicesCardDecodedBarcode {
    return {
      kind: DecodedBarcodeKind.BCServicesCardBarcode,
      bcscSerial: barcode.value,
    }
  }
}

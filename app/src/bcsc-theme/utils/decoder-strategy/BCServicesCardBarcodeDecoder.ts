import { parseLooseSerial } from '@/bcsc-theme/utils/card-serial'
import {
  BCServicesCardBarcode,
  BCServicesCardDecodedBarcode,
  DecodedCodeKind,
  DecoderStrategy,
  ScanableCode,
} from './DecoderStrategy'

/**
 * Decoder for BC Services Card Code 39 barcodes.
 *
 * These barcodes encode the BCSC serial number and are typically
 * located on the right side of the card.
 *
 * @class
 * @implements {DecoderStrategy}
 */
export class BCServicesCardBarcodeDecoder implements DecoderStrategy {
  canDecode(barcode: ScanableCode): barcode is BCServicesCardBarcode {
    return (
      (barcode.type === 'code-39' || barcode.type === 'code-128') &&
      typeof barcode.value === 'string' &&
      parseLooseSerial(barcode.value) !== null
    )
  }

  decode(barcode: BCServicesCardBarcode): BCServicesCardDecodedBarcode {
    // QUESTION (MD): Should we throw here?
    if (!this.canDecode(barcode)) {
      throw new Error('Failed to decode BCSC card barcode. Did you forget to check if it can be decoded?')
    }

    return {
      kind: DecodedCodeKind.BCServicesCardBarcode,
      bcscSerial: barcode.value,
    }
  }
}

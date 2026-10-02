import { decodeBCCardBarcode } from '../bc-card-barcode'
import { toDriversLicenseMetadata } from '../card-barcode-decoder'
import {
  DecodedCodeKind,
  DecoderStrategy,
  DriversLicenseBarcode,
  DriversLicenseDecodedBarcode,
  ScanableCode,
} from './DecoderStrategy'

/**
 * Decoder for the PDF-417 barcode on BC driver's licences, BCIDs, BC Services Cards and combo cards.
 * Parsing follows ICBC's 3-track layout; see {@link decodeBCCardBarcode}.
 *
 * @class
 * @implements {DecoderStrategy}
 */
export class DriversLicenseBarcodeDecoder implements DecoderStrategy {
  canDecode(barcode: ScanableCode): barcode is DriversLicenseBarcode {
    return (
      barcode.type === 'pdf-417' &&
      typeof barcode.value === 'string' &&
      !('source' in decodeBCCardBarcode(barcode.value))
    )
  }

  decode(barcode: DriversLicenseBarcode): DriversLicenseDecodedBarcode {
    const card = decodeBCCardBarcode(barcode.value)
    if ('source' in card) {
      throw new Error("Failed to decode driver's license barcode. Did you forget to check if it can be decoded?")
    }

    return { kind: DecodedCodeKind.DriversLicenseBarcode, ...toDriversLicenseMetadata(card) }
  }
}

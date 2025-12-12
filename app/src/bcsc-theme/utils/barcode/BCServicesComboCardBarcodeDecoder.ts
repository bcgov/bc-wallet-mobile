import {
  Barcode,
  BarcodeDecoderStrategy,
  BCServicesComboCardDecoded,
  DecodedBarcodeKind,
  DriversLicenseBarcode,
} from './barcode-decoder-strategy'
import { DriversLicenseBarcodeDecoder } from './DriversLicenseBarcodeDecoder'

/**
 * Decoder for BC Services Combo Card barcodes (PDF-417)
 */
export class BCComboCardBarcodeDecoder implements BarcodeDecoderStrategy {
  canDecode(barcode: Barcode): barcode is DriversLicenseBarcode {
    return (
      barcode.type === 'pdf-417' && typeof barcode.value === 'string' && this.parseBcscSerial(barcode.value) !== null
    )
  }

  decodeBarcode(barcode: DriversLicenseBarcode): BCServicesComboCardDecoded {
    const driversLicenseDecoder = new DriversLicenseBarcodeDecoder()
    const decodedDriversLicense = driversLicenseDecoder.decodeBarcode(barcode)

    return {
      ...decodedDriversLicense,
      kind: DecodedBarcodeKind.BCServicesComboCardCardBarcode,
      bcscSerial: decodedDriversLicense.licenseNumber,
    }
  }

  private parseBcscSerial(value: string): string | null {
    return 'TODO'
  }
}

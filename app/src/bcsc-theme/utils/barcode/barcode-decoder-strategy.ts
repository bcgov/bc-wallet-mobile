import { CodeType } from 'react-native-vision-camera'
import { BCServicesCardBarcodeDecoder } from './BCServicesCardBarcodeDecoder'
import { BCComboCardBarcodeDecoder } from './BCServicesComboCardBarcodeDecoder'
import { DriversLicenseBarcodeDecoder } from './DriversLicenseBarcodeDecoder'

// Enum representing the kinds of decoded barcodes
export enum DecodedBarcodeKind {
  DriversLicenseBarcode = 'DriversLicenseBarcode',
  BCServicesCardBarcode = 'BCServicesCardBarcode',
  BCServicesComboCardCardBarcode = 'BCServicesComboCardCardBarcode',
}

// Stub interface representing a scanned barcode
export interface Barcode {
  type: CodeType | 'unknown'
  value?: string
}

export type DecodedBarcode = BCServicesCardDecodedBarcode | DriversLicenseDecodedBarcode | BCServicesComboCardDecoded

// Interface for barcode decoding strategies
export interface BarcodeDecoderStrategy {
  /**
   * Determines if the strategy can decode the given barcode.
   *
   * @param barcode The barcode to check.
   * @returns True if the strategy can decode the barcode, false otherwise.
   */
  canDecode(barcode: Barcode): boolean
  /**
   * Decodes the given barcode.
   *
   * @param barcode The barcode to decode.
   * @returns The decoded barcode information.
   */
  decodeBarcode(barcode: Barcode): DecodedBarcode
}

// Narrowed drivers license barcode type
export interface DriversLicenseBarcode {
  type: 'pdf-417'
  value: string
}

// Narrowed BC services card barcode type
export interface BCServicesCardBarcode {
  type: 'code-39'
  value: string
}

export interface BCServicesCardDecodedBarcode {
  kind: DecodedBarcodeKind.BCServicesCardBarcode
  bcscSerial: string
}

export interface DriversLicenseDecodedBarcode {
  kind: DecodedBarcodeKind.DriversLicenseBarcode
  licenseNumber: string
  firstName: string
  middleNames: string
  lastName: string
  birthDate: Date
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

export interface BCServicesComboCardDecoded {
  kind: DecodedBarcodeKind.BCServicesComboCardCardBarcode
  bcscSerial: string
  licenseNumber: string
  firstName: string
  middleNames: string
  lastName: string
  birthDate: Date
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

/**
 * Returns an array of barcode decoding strategies in the order they should be attempted.
 *
 * @returns An array of barcode decoding strategies.
 */
export const getBarcodeDecoderStrategies = (): BarcodeDecoderStrategy[] => {
  return [
    new BCServicesCardBarcodeDecoder(),
    // Note: Attempt combo card decoding before drivers license decoding
    new BCComboCardBarcodeDecoder(),
    new DriversLicenseBarcodeDecoder(),
  ]
}

/**
 * Decodes a barcode using the provided decoding strategies.
 *
 * @param barcode The barcode to decode.
 * @param decoderStrategies An array of barcode decoding strategies to use. Defaults to the standard strategies.
 * @returns The decoded barcode information, or null if decoding was unsuccessful.
 */
export const decodeBarcode = (
  barcode: Barcode,
  decoderStrategies: BarcodeDecoderStrategy[] = getBarcodeDecoderStrategies()
): DecodedBarcode | null => {
  for (const strategy of decoderStrategies) {
    if (strategy.canDecode(barcode)) {
      return strategy.decodeBarcode(barcode)
    }
  }

  return null
}

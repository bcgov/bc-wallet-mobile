import { CodeType } from 'react-native-vision-camera'
import { BCServicesCardBarcodeDecoder } from './BCServicesCardBarcodeDecoder'
import { BCComboCardBarcodeDecoder } from './BCServicesComboCardBarcodeDecoder'
import { DriversLicenseBarcodeDecoder } from './DriversLicenseBarcodeDecoder'

// Enum representing the kinds of decoded codes
export enum DecodedCodeKind {
  DriversLicenseBarcode = 'DriversLicenseBarcode',
  BCServicesCardBarcode = 'BCServicesCardBarcode',
  BCServicesComboCardCardBarcode = 'BCServicesComboCardCardBarcode',
}

// Stub interface representing a scanned code ie: barcode or qr code
export interface ScanableCode {
  type: CodeType | 'unknown'
  value?: string
}

export type DecodedCode = BCServicesCardDecodedBarcode | DriversLicenseDecodedBarcode | BCServicesComboCardDecoded

// Interface for code decoding strategies
export interface DecoderStrategy {
  /**
   * Determines if the strategy can decode the given code.
   *
   * @param scanableCode The scanable code to check.
   * @returns True if the strategy can decode the code, false otherwise.
   */
  canDecode(scanableCode: ScanableCode): boolean
  /**
   * Decodes the given code.
   *
   * @param scanableCode The scanable code to decode.
   * @returns The decoded information.
   */
  decode(scanableCode: ScanableCode): DecodedCode
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
  kind: DecodedCodeKind.BCServicesCardBarcode
  bcscSerial: string
}

export interface DriversLicenseDecodedBarcode {
  kind: DecodedCodeKind.DriversLicenseBarcode
  licenseNumber: string
  firstName: string
  middleNames: string
  lastName: string
  birthDate: Date
  expiryDate: Date
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

export interface BCServicesComboCardDecoded {
  kind: DecodedCodeKind.BCServicesComboCardCardBarcode
  bcscSerial: string
  licenseNumber: string
  firstName: string
  middleNames: string
  lastName: string
  birthDate: Date
  expiryDate: Date
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

/**
 * Returns an array of code decoding strategies in the order they should be attempted.
 *
 * @returns An array of code decoding strategies.
 */
export const getDecoderStrategies = (): DecoderStrategy[] => {
  return [
    new BCServicesCardBarcodeDecoder(),
    // Note: Attempt combo card decoding before drivers license decoding
    new BCComboCardBarcodeDecoder(),
    new DriversLicenseBarcodeDecoder(),
  ]
}

/**
 * Decodes a scanable code using the provided decoding strategies.
 *
 * @param code The scanable code to decode.
 * @param decoderStrategies An array of decoding strategies to use. Defaults to the standard strategies.
 * @returns The decoded code information, or null if decoding was unsuccessful.
 */
export const decodeScannedCode = (
  code: ScanableCode,
  decoderStrategies: DecoderStrategy[] = getDecoderStrategies()
): DecodedCode | null => {
  for (const strategy of decoderStrategies) {
    if (strategy.canDecode(code)) {
      return strategy.decode(code)
    }
  }

  return null
}

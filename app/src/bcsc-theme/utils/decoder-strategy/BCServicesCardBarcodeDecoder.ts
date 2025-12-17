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
    return barcode.type === 'code-39' && typeof barcode.value === 'string' && isBCSCSerial(barcode.value)
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

/**
 * Validates if a given serial number matches the BCSC serial format.
 * BCSC serial numbers `usually` consists of 1 letter followed by 8 digits (e.g., A12345678).
 *
 * Rules:
 * 	- Starts with one or more letters (A-Z, a-z)
 * 	- Followed by one or more digits (0-9)
 * 	- Total length must not exceed 9 characters
 *
 * @param serial - The serial number to validate.
 * @returns True if the serial number is valid, false otherwise.
 */
export const isBCSCSerial = (serial: string): boolean => {
  return /^[A-Za-z]+[0-9]+$/.test(serial) && serial.length <= 9
}

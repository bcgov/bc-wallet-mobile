import { AbstractBifoldLogger } from '@bifold/core'
import { Barcode, BarcodeFormat } from 'react-native-vision-camera-barcode-scanner'
import { BCComboCardBarcodeDecoder } from './BCComboCardBarcodeDecoder'
import { BCServicesCardBarcodeDecoder } from './BCServicesCardBarcodeDecoder'
import { DriversLicenseBarcodeDecoder } from './DriversLicenseBarcodeDecoder'

type RawBarcodeValue = string

// Enum representing the kinds of decoded codes
export enum DecodedCodeKind {
  DriversLicenseBarcode = 'DriversLicenseBarcode',
  BCServicesCardBarcode = 'BCServicesCardBarcode',
  BCServicesComboCardCardBarcode = 'BCServicesComboCardCardBarcode',
}

// Stub interface representing a scanned code ie: barcode or qr code
export interface ScanableCode {
  type: BarcodeFormat | 'unknown'
  value?: string
}

export type DecodedCode =
  | BCServicesCardDecodedBarcode
  | DriversLicenseDecodedBarcode
  | BCServicesComboCardDecodedBarcode

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
  type: 'code-39' | 'code-128'
  value: string
}

export interface BCServicesCardDecodedBarcode {
  kind: DecodedCodeKind.BCServicesCardBarcode
  bcscSerial: string
}

export interface DriversLicenseMetadata {
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
  /** Issuer Identification Number from AAMVA track 2 (e.g. BC = '636028'). */
  isoIIN: string
}

export interface DriversLicenseDecodedBarcode extends DriversLicenseMetadata {
  kind: DecodedCodeKind.DriversLicenseBarcode
}

export interface BCServicesComboCardDecodedBarcode extends DriversLicenseMetadata {
  kind: DecodedCodeKind.BCServicesComboCardCardBarcode
  bcscSerial: string
}

/**
 * Returns an array of code decoding strategies in the order they should be attempted.
 *
 * @returns An ordered array of code decoding strategies.
 */
export const getDecoderStrategies = (): DecoderStrategy[] => {
  return [
    // Note: Attempt combo card decoding before drivers license decoding
    new BCComboCardBarcodeDecoder(),
    new DriversLicenseBarcodeDecoder(),
    new BCServicesCardBarcodeDecoder(),
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
  logger: AbstractBifoldLogger,
  decoderStrategies: DecoderStrategy[] = getDecoderStrategies()
): DecodedCode | null => {
  for (const strategy of decoderStrategies) {
    if (strategy.canDecode(code)) {
      try {
        return strategy.decode(code)
      } catch (error) {
        logger.warn(`Error decoding ${code.type} barcode`, { error })
        // Decoder matched but failed to parse — try the next strategy
        continue
      }
    }
  }

  return null
}

/**
 * Decodes an array of scannable codes using the provided decoding strategies.
 *
 * @param codes An array of scannable codes to decode.
 * @param logger A logger instance for logging decoding attempts and errors.
 * @returns An array of decoded code information, with null entries for codes that could not be decoded.
 */
export const decodeBarcodes = (codes: ScanableCode[], logger: AbstractBifoldLogger): (DecodedCode | null)[] => {
  const decodedCodes: Array<DecodedCode | null> = []

  for (const code of codes) {
    if (code.type === 'unknown') {
      logger.debug('[DecodeBarcodes] Skipping unknown barcode')
      continue
    }

    const decodedCode = decodeScannedCode(code, logger)

    if (!decodedCode) {
      logger.debug('[DecodeBarcodes] Failed to decode barcode', { barcode: code })
    } else {
      logger.debug('[DecodeBarcodes] Decoded barcode metadata:', { barcode: code, metadata: decodedCode })
    }

    decodedCodes.push(decodedCode)
  }

  return decodedCodes
}

/**
 * A class that manages the decoding of barcodes scanned from BC Services Cards
 */
export class BCServicesCardReader {
  /** @example { "K123456789": { hits: 3, decoded: { kind: "BCServicesCardBarcode", bcscSerial: "K123456789" } } } */
  private decodedBarcodeMap = new Map<RawBarcodeValue, { hits: number; decoded: DecodedCode }>()
  private isBCServicesCardFlag: boolean | null = null
  private unknownBarcodeCount = 0

  constructor(
    private logger: AbstractBifoldLogger,
    private hitsThreshold = 5
  ) {}

  /**
   * Adds an array of barcodes to the reader for decoding and analysis.
   * @param codes An array of barcodes to be added and decoded.
   * @returns void. The internal state of the reader is updated with the decoded information from the barcodes.
   */
  addBarcodes(codes: Barcode[]) {
    if (!codes.length) {
      return
    }

    const scanableCodes = codes.map((barcode) => ({
      type: barcode.format,
      value: barcode.rawValue,
    }))

    for (const code of scanableCodes) {
      const decoded = decodeScannedCode(code, this.logger)

      this.logger.debug('[BCSCEvidenceDecoder] Decoded barcode metadata:', { barcode: code, decoded })

      if (!decoded || !code.value) {
        this.unknownBarcodeCount++
        continue
      }

      if (
        (this.isBCServicesCardFlag === null && decoded.kind === DecodedCodeKind.BCServicesCardBarcode) ||
        decoded.kind === DecodedCodeKind.BCServicesComboCardCardBarcode
      ) {
        this.isBCServicesCardFlag = true
      }

      const hits = this.decodedBarcodeMap.get(code.value)?.hits ?? 0
      this.decodedBarcodeMap.set(code.value, { hits: hits + 1, decoded })
    }
  }

  /**
   * Resets the internal state of the BCServicesCardReader, clearing all decoded barcode data and resetting flags and counters.
   * @returns The BCServicesCardReader instance, allowing for method chaining.
   */
  reset() {
    this.decodedBarcodeMap.clear()
    this.isBCServicesCardFlag = null
    this.unknownBarcodeCount = 0
    return this
  }

  /**
   * Determines if the scanned barcodes indicate that the card is a BC Services Card.
   * @returns True if the card is identified as a BC Services Card, false if it is not,
   * or null if the determination cannot be made yet (still scanning - under threshold).
   *
   */
  isBCServicesCard(): boolean | null {
    return this.isBCServicesCardFlag
  }

  /**
   * Retrieves the serial number from the best decoded BC Services Card barcode or BC Services Combo Card barcode.
   * @returns The serial number as a string if available, or null if not found.
   */
  getSerial(): string | null {
    return (
      this.getBestDecodedCode(DecodedCodeKind.BCServicesCardBarcode)?.bcscSerial ??
      this.getBestDecodedCode(DecodedCodeKind.BCServicesComboCardCardBarcode)?.bcscSerial ??
      null
    )
  }

  /**
   * Retrieves the driver's license metadata from the best decoded BC Services Combo Card barcode or Driver's License barcode.
   * @returns The driver's license metadata if available, or null if not found.
   */
  getLicense(): DriversLicenseMetadata | null {
    return (
      this.getBestDecodedCode(DecodedCodeKind.BCServicesComboCardCardBarcode) ??
      this.getBestDecodedCode(DecodedCodeKind.DriversLicenseBarcode) ??
      null
    )
  }

  /**
   * Retrieves the birthdate from the best decoded driver's license metadata.
   * @returns The birthdate as a Date object if available, or null if not found.
   */
  getBirthdate(): Date | null {
    return this.getLicense()?.birthDate ?? null
  }

  /**
   * Retrieves the best decoded code of a specific kind from the internal decoded barcode map.
   * @param kind The kind of decoded code to retrieve.
   * @returns The best decoded code of the specified kind if available, or undefined if not found.
   */
  private getBestDecodedCode<T extends DecodedCodeKind>(kind: T): Extract<DecodedCode, { kind: T }> | undefined {
    let bestHits = 0
    let bestDecoded: Extract<DecodedCode, { kind: T }> | undefined

    for (const { hits, decoded } of this.decodedBarcodeMap.values()) {
      if (hits < bestHits || hits < this.hitsThreshold || decoded.kind !== kind) {
        continue
      }

      bestHits = hits
      bestDecoded = decoded as Extract<DecodedCode, { kind: T }>
    }

    return bestDecoded
  }
}

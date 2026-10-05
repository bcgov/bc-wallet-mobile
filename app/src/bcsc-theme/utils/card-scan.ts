import { BCCardBarcode } from '@/bcsc-theme/utils/bc-card-barcode'
import { DecodedCardBarcode } from '@/bcsc-theme/utils/card-barcode-decoder'

export interface CardScan {
  /** From the 1D barcode only; never the PDF-417's DCN. */
  readonly serial: string | null
  readonly card: BCCardBarcode | null
}

export const EMPTY_CARD_SCAN: CardScan = Object.freeze({ serial: null, card: null })

/** Folds reads in order: a later read of the same barcode replaces an earlier one, a failed read changes nothing. Never mutates `previous`. */
export const combineCardBarcodes = (previous: CardScan, reads: readonly DecodedCardBarcode[]): CardScan =>
  reads.reduce<CardScan>((scan, read) => {
    switch (read.source) {
      case '1d':
        return { ...scan, serial: read.serial }
      case 'pdf417':
        // Use the serial from the 1D barcode for safety (ie: Alberta DL + appended health number)
        return { ...scan, card: read.card }
      case 'failure':
        return scan
    }
  }, previous)

import { CardBarcodeFailure } from '@/bcsc-theme/utils/bc-card-barcode'

type FailureReason = CardBarcodeFailure['reason']

/**
 * How many failed scan attempts the scanner allows before it asks the citizen whether they have a
 * BC Services Card. A single failed read never changes the citizen's path.
 *
 * An attempt is one scan the camera hands over: it locks on what it has read, and resets after a
 * rejected scan. Attempts can come several a second, so tune this from the logged attempt counts.
 */
export const FAILED_SCAN_ATTEMPTS_BEFORE_ASKING = 5

/** Failed scan attempts since the scanner last reset, with how often each failure reason was seen. */
export interface FailedScanAttempts {
  count: number
  reasons: Record<FailureReason, number>
}

export const NO_FAILED_SCAN_ATTEMPTS: FailedScanAttempts = { count: 0, reasons: { damaged: 0, unsupported: 0 } }

/**
 * Records one failed attempt: a scan that ended without a complete card and held at least one
 * barcode that did not decode. A partial read counts, so a card whose other barcode never decodes
 * still reaches the question. Pauses between attempts don't reset the count; only a scanner reset does.
 *
 * @param attempts - The attempts so far.
 * @param reasons - Why each barcode in this attempt failed to decode; must not be empty.
 */
export const recordFailedScanAttempt = (
  attempts: FailedScanAttempts,
  reasons: readonly FailureReason[]
): FailedScanAttempts => {
  const next = { count: attempts.count + 1, reasons: { ...attempts.reasons } }
  for (const reason of reasons) {
    next.reasons[reason] += 1
  }
  return next
}

/** Whether the scanner has failed often enough to ask the citizen about their card. */
export const shouldAskAboutCard = (attempts: FailedScanAttempts): boolean =>
  attempts.count >= FAILED_SCAN_ATTEMPTS_BEFORE_ASKING

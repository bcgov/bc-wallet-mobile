import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError, ErrorRegistry } from '@/errors'
import { TOKENS, useServices } from '@bifold/core'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const ALLOWED_QR_SCHEMES = [
  'http',
  'https',
  'didcomm',
  'openid',
  'openid4vp',
  'openid-vc',
  'openid-credential-offer',
  'openid-initiate-issuance',
]

export class QRError extends Error {
  reason: string
  constructor(message: string, reason: string) {
    super(message)
    this.reason = reason
  }
}

export type QRCodeStrategy = {
  matches: (uri: string) => boolean
  handle: (uri: string) => void | Promise<void>
  toErrorModal: (error: unknown) => { error: AppError; title: string; description: string } | null
}

/**
 * Custom hook to handle QR code scanning with multiple strategies.
 * @param strategies - An array of QRCodeStrategy objects that define how to handle different QR code formats.
 * @returns An object containing the scan handling functions and state.
 */
export const useQRScanner = (strategies: QRCodeStrategy[]) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [isProcessing, setIsProcessing] = useState(false)
  const lockedRef = useRef(false) // held while processing, and after success until the screen refocuses
  const processingRef = useRef(false)
  const { emitErrorModal, isErrorModalVisible } = useErrorAlert()

  const lastUnrecognizedRef = useRef<string | null>(null) // ignored until a different value arrives or resetLock runs

  /**
   * Handle a scanned QR code value by finding a matching strategy and executing its handler.
   * @param value - The scanned QR code value.
   * @returns A promise that resolves when the scan handling is complete.
   */
  const handleScan = useCallback(
    async (value: string) => {
      if (lockedRef.current || isErrorModalVisible) {
        return
      }

      if (value === lastUnrecognizedRef.current) {
        return // the dismissed code is still in frame, ScanCamera remounted with an empty dedupe set
      }

      lastUnrecognizedRef.current = null

      const strategy = strategies.find((s) => s.matches(value))

      if (!strategy) {
        lastUnrecognizedRef.current = value
        // NOTE: This will help us identify missing and misconfigured strategies
        logger.warn('[useQRScanner] No strategy matched scanned QR code', describeQRCode(value))
        return emitErrorModal(
          t('BCSC.Scan.UnrecognizedQR'),
          t('BCSC.Scan.UnrecognizedQRDescription'),
          AppError.fromErrorDefinition(ErrorRegistry.INVALID_QR_CODE, { context: describeQRCode(value) })
        )
      }

      lockedRef.current = true
      processingRef.current = true
      setIsProcessing(true)

      try {
        await strategy.handle(value) // success: lock stays held
      } catch (error) {
        lockedRef.current = false // failure: unlock to allow retry
        const modal = strategy.toErrorModal(error)

        if (modal) {
          return emitErrorModal(modal.title, modal.description, modal.error)
        }
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [isErrorModalVisible, strategies, logger, emitErrorModal, t]
  )

  // Call from the screen's focus effect to unlock scanning after a completed flow.
  const resetLock = useCallback(() => {
    lastUnrecognizedRef.current = null
    if (processingRef.current) {
      return // a refocus must not release a scan that is still running
    }
    lockedRef.current = false
  }, [])

  return { handleScan, isProcessing, resetLock }
}

/**
 * Describes a QR code value by extracting its scheme, length, and presence of query or fragment components.
 * NOTE: Doesn't expose the actual value to avoid logging sensitive information.
 * @param value - The QR code value to describe.
 * @returns An object containing the scheme, length, and flags for query and fragment presence.
 */
function describeQRCode(value: string) {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase() ?? 'none'
  const allowedSchemes = new Set(ALLOWED_QR_SCHEMES)

  return {
    qrScheme: allowedSchemes.has(scheme) ? scheme : 'unknown',
    qrLength: value.length,
    qrHasQuery: value.includes('?'),
    qrHasFragment: value.includes('#'),
  }
}

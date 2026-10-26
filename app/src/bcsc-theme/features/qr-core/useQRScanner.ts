import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError } from '@/errors'
import { isAppError } from '@/errors/appError'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
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

type ToErrorModalReturn = {
  /**
   * The error that occurred during the QR code handling process.
   */
  error: AppError
  /**
   * The title to display in the error modal.
   */
  title: string
  /**
   * The description/message to display in the error modal.
   */
  description: string
  /**
   * Indicates whether the error modal should include a report button for sending error details to support.
   * @default true
   */
  enableReport?: boolean
}

/** An error a strategy throws on purpose, tagged with the reason so its modal can say the right thing. */
export class QRError extends Error {
  reason?: string
  constructor(message: string, reason?: string) {
    super(message)
    this.reason = reason
  }
}

export type QRCodeStrategy = {
  matches: (uri: string) => boolean
  handle: (uri: string) => void | Promise<void>
  toErrorModal: (error: unknown) => ToErrorModalReturn | null // Return null to suppress the modal. ie: already handled.
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

  const handleUnrecognizedError = useCallback(
    (error: unknown, value: string) => {
      lastUnrecognizedRef.current = value

      logger.warn('[useQRScanner] Unrecognized QR code', describeQRCode(value))

      const appError = ensureAppError(error, AppEventCode.UNRECOGNIZED_QR_CODE)
      appError.addContext(describeQRCode(value))

      return emitErrorModal(t('BCSC.Scan.UnrecognizedQR'), t('BCSC.Scan.UnrecognizedQRDescription'), appError)
    },
    [emitErrorModal, logger, t]
  )

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

      lastUnrecognizedRef.current = null

      const strategy = strategies.find((s) => s.matches(value))

      if (!strategy || lastUnrecognizedRef.current === value) {
        return handleUnrecognizedError(new QRError('Unrecognized QR code'), value)
      }

      lockedRef.current = true
      processingRef.current = true
      setIsProcessing(true)

      try {
        await strategy.handle(value) // success: lock stays held
      } catch (error) {
        lockedRef.current = false // failure: unlock to allow retry

        const modal = strategy.toErrorModal(error)

        if (isAppError(modal?.error, AppEventCode.UNRECOGNIZED_QR_CODE)) {
          return handleUnrecognizedError(error, value)
        }

        if (modal) {
          return emitErrorModal(modal.title, modal.description, modal.error, { enableReport: modal.enableReport })
        }
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [isErrorModalVisible, strategies, handleUnrecognizedError, emitErrorModal]
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

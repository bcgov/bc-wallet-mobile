import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError } from '@/errors'
import { QrCodeScanError } from '@bifold/core'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export type QRCodeStrategy = {
  matches: (uri: string) => boolean
  handle: (uri: string) => void | Promise<void>
  toErrorModal?: (error: unknown) => { error: AppError; title: string; description: string } | null
}

/**
 * Custom hook to handle QR code scanning with multiple strategies.
 * @param strategies - An array of QRCodeStrategy objects that define how to handle different QR code formats.
 * @returns An object containing the scan handling functions and state.
 */
export const useQRScanner = (strategies: QRCodeStrategy[]) => {
  const { t } = useTranslation()
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const [scannerKey, setScannerKey] = useState(0) // used to remount the scanner when an error occurs
  const lockedRef = useRef(false) // held while processing, and after success until the screen refocuses
  const processingRef = useRef(false)
  const { emitErrorModal, isErrorModalVisible } = useErrorAlert()

  // Dismiss the current scan error, allowing the user to try scanning again.
  const dismissError = useCallback(() => setScanError(null), [])

  /**
   * Handle errors that occur during QR code scanning.
   * @param error - The error that occurred during scanning.
   * @param value - The scanned QR code value that caused the error.
   * @param strategy - The QRCodeStrategy that was being used when the error occurred, if any.
   * @returns void
   */
  const handleQRScanError = useCallback(
    (error: unknown, value: string, strategy: QRCodeStrategy | undefined) => {
      let scanError: QrCodeScanError
      const errorModal = strategy?.toErrorModal?.(error)

      if (errorModal === null) {
        // strategy does not want to show a modal (ie: previously handled)
        return
      } else if (errorModal) {
        // strategy has provided a custom error modal to show
        return emitErrorModal(errorModal.title, errorModal.description, errorModal.error, {
          action: {
            text: t('Global.Retry'),
            onPress: () => {
              setScannerKey((prevKey) => prevKey + 1) // remount the scanner to clear its frozen state
            },
          },
        })
      }
      // TODO (MD): Remove these legacy paths once all strategies have been updated to use toErrorModal
      else if (error instanceof QrCodeScanError) {
        scanError = error
      } else if (error instanceof Error) {
        scanError = new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, error.message)
      } else {
        scanError = new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, String(error))
      }

      setScanError(scanError)
    },
    [emitErrorModal, t]
  )

  /**
   * Handle a scanned QR code value by finding a matching strategy and executing its handler.
   * @param value - The scanned QR code value.
   * @returns A promise that resolves when the scan handling is complete.
   */
  const handleScan = useCallback(
    async (value: string) => {
      if (lockedRef.current || scanError || isErrorModalVisible) {
        return
      }

      lockedRef.current = true
      processingRef.current = true
      setIsProcessing(true)

      let strategy: QRCodeStrategy | undefined
      try {
        strategy = strategies.find((s) => s.matches(value))

        if (!strategy) {
          throw new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'), value)
        }

        await strategy.handle(value) // success: lock stays held
      } catch (error) {
        lockedRef.current = false
        handleQRScanError(error, value, strategy)
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [scanError, isErrorModalVisible, strategies, t, handleQRScanError]
  )

  // Call from the screen's focus effect to unlock scanning after a completed flow.
  const resetLock = useCallback(() => {
    if (processingRef.current) {
      return // a refocus must not release a scan that is still running
    }
    lockedRef.current = false
  }, [])

  return { handleScan, isProcessing, scanError, dismissError, resetLock, scannerKey }
}

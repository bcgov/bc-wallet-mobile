import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError, ErrorRegistry } from '@/errors'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const [isProcessing, setIsProcessing] = useState(false)
  const lockedRef = useRef(false) // held while processing, and after success until the screen refocuses
  const processingRef = useRef(false)
  const { emitErrorModal, isErrorModalVisible } = useErrorAlert()

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

      const strategy = strategies.find((s) => s.matches(value))

      if (!strategy) {
        // NOTE: This will help us identify missing and misconfigured strategies
        return emitErrorModal(
          t('BCSC.Scan.UnrecognizedQR'),
          t('BCSC.Scan.UnrecognizedQRDescription'),
          AppError.fromErrorDefinition(ErrorRegistry.INVALID_QR_CODE, { context: { qrCode: value } })
        )
      }

      lockedRef.current = true
      processingRef.current = true
      setIsProcessing(true)

      try {
        await strategy.handle(value) // success: lock stays held
      } catch (error) {
        lockedRef.current = false
        const modal = strategy.toErrorModal?.(error)

        if (modal) {
          return emitErrorModal(modal.title, modal.description, modal.error)
        }
      } finally {
        processingRef.current = false
        setIsProcessing(false)
      }
    },
    [isErrorModalVisible, strategies, emitErrorModal, t]
  )

  // Call from the screen's focus effect to unlock scanning after a completed flow.
  const resetLock = useCallback(() => {
    if (processingRef.current) {
      return // a refocus must not release a scan that is still running
    }
    lockedRef.current = false
  }, [])

  return { handleScan, isProcessing, resetLock }
}

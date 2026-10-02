import { QrCodeScanError } from '@bifold/core'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export type QRCodeStrategy = {
  matches: (uri: string) => boolean
  handle: (uri: string) => void | Promise<void>
}

export const useQRScanner = (strategies: QRCodeStrategy[]) => {
  const { t } = useTranslation()
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const lockedRef = useRef(false) // held while processing, and after success until the screen refocuses

  const handleScan = useCallback(
    async (value: string) => {
      if (lockedRef.current || scanError) {
        return
      }

      lockedRef.current = true
      setIsProcessing(true)

      try {
        const strategy = strategies.find((s) => s.matches(value))

        if (!strategy) {
          throw new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'), value)
        }

        await strategy.handle(value) // success: lock stays held
      } catch (error) {
        lockedRef.current = false
        const scanError =
          error instanceof QrCodeScanError
            ? error
            : new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, String(error))
        setScanError(scanError)
      } finally {
        setIsProcessing(false)
      }
    },
    [strategies, scanError, t]
  )

  const dismissError = useCallback(() => setScanError(null), [])

  // Call from the screen's focus effect to unlock scanning after a completed flow.
  const resetLock = useCallback(() => {
    lockedRef.current = false
  }, [])

  return { handleScan, isProcessing, scanError, dismissError, resetLock }
}

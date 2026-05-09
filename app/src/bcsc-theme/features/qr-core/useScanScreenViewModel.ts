import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { QrCodeScanError, TOKENS, useServices } from '@bifold/core'
import { useAgent } from '@bifold/react-hooks'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCameraPermission } from 'react-native-vision-camera'

import { DidCommOobStrategy, PairingCodeStrategy } from './uri-strategies'
import type { UriStrategy } from './uri-strategies/types'

export interface UseScanScreenViewModelOptions {
  /**
   * Called when a strategy returns `{ kind: 'connection' }`. The screen decides
   * how to navigate (push within its own stack, or escape up to MainStack).
   */
  onConnectionFound: (oobRecordId: string) => void
  strategies?: UriStrategy[]
}

const DEFAULT_STRATEGIES: UriStrategy[] = [DidCommOobStrategy, PairingCodeStrategy]

const useScanScreenViewModel = (options: UseScanScreenViewModelOptions) => {
  const { onConnectionFound } = options
  const strategies = useMemo(() => options.strategies ?? DEFAULT_STRATEGIES, [options.strategies])
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { hasPermission, requestPermission } = useCameraPermission()
  const { isLoading: isPermissionLoading } = useAutoRequestPermission(hasPermission, requestPermission)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const isProcessingRef = useRef(false)

  const handleScan = useCallback(
    async (value: string) => {
      if (isProcessingRef.current || scanError != null) {
        return
      }
      isProcessingRef.current = true
      setIsProcessing(true)
      setScanError(null)

      try {
        const strategy = strategies.find((s) => s.matches(value))
        if (!strategy) {
          setScanError(new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'), value))
          return
        }

        const result = await strategy.handle(value, { agent, logger })
        switch (result.kind) {
          case 'connection':
            onConnectionFound(result.oobRecordId)
            break
          case 'unsupported':
            // BCSC v4.1 rejects OpenID and mediator URIs at the strategy layer; show a localized
            // message keyed by reason so future strategies can add their own without changing this switch.
            setScanError(new QrCodeScanError(t(`BCSC.Scan.Unsupported.${result.reason}`), value))
            break
          case 'unrecognized':
            setScanError(new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'), value))
            break
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error(`[ScanScreen] strategy threw: ${message}`)
        setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, message))
      } finally {
        isProcessingRef.current = false
        setIsProcessing(false)
      }
    },
    [strategies, scanError, t, agent, logger, onConnectionFound]
  )

  const dismissError = useCallback(() => setScanError(null), [])

  return {
    isPermissionLoading,
    hasPermission,
    isProcessing,
    scanError,
    handleScan,
    dismissError,
  }
}

export default useScanScreenViewModel

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
  /**
   * Called when a strategy returns `{ kind: 'pairing-code' }`. The screen
   * routes the code into the pairing flow (typically the sibling PairingCode tab).
   */
  onPairingCodeFound: (pairingCode: string) => void
  strategies?: UriStrategy[]
}

// Ordering matters: `Array.find` returns the first matching strategy. Both
// strategies parse URLs with disjoint shapes (DIDComm OOB vs pairingqrcode.html),
// so order is not load-bearing today; keep DIDComm first to match the original seam.
const DEFAULT_STRATEGIES: UriStrategy[] = [DidCommOobStrategy, PairingCodeStrategy]

const useScanScreenViewModel = (options: UseScanScreenViewModelOptions) => {
  const { onConnectionFound, onPairingCodeFound } = options
  const strategies = useMemo(() => options.strategies ?? DEFAULT_STRATEGIES, [options.strategies])
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { hasPermission, requestPermission } = useCameraPermission()
  const { isLoading: isPermissionLoading } = useAutoRequestPermission(hasPermission, requestPermission)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const isProcessingRef = useRef(false)
  // ScanCamera continues firing frames after a successful scan, so a second
  // invocation can race the navigation and trip an "already received" error
  // on the OOB record. `isNavigatingRef` short-circuits any scan that lands
  // after we've handed off to ConnectionLoading; reset on focus so the user
  // can scan again if they navigate back.
  const isNavigatingRef = useRef(false)

  const handleScan = useCallback(
    async (value: string) => {
      if (isProcessingRef.current || isNavigatingRef.current || scanError != null) {
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
            // Latch before the navigation handoff so frames that land during
            // the transition (see isNavigatingRef comment above) are ignored.
            isNavigatingRef.current = true
            onConnectionFound(result.oobRecordId)
            break
          case 'pairing-code':
            isNavigatingRef.current = true
            onPairingCodeFound(result.pairingCode)
            break
          case 'unsupported':
            // BCSC v4.1 rejects OpenID and mediator URIs at the strategy layer; show a localized
            // message keyed by reason so future strategies can add their own without changing this switch.
            setScanError(new QrCodeScanError(t(`BCSC.Scan.Unsupported.${result.reason}`), value))
            break
          case 'unrecognized':
            setScanError(new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'), value))
            break
          default: {
            // Defensive: a future ScanResult variant added without updating this switch would
            // otherwise leave the screen idle with no error shown. Log + surface as invalid so the
            // user gets feedback and the dropped variant shows up in logs.
            const exhaustive: never = result
            logger.error(`[ScanScreen] unhandled scan result kind: ${JSON.stringify(exhaustive)}`)
            setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value))
            break
          }
        }
      } catch (err) {
        // Swallow errors that fire during the post-navigation transition —
        // ScanCamera frames that race the handoff would otherwise pop an
        // "invalid QR" modal on top of the success flow.
        if (isNavigatingRef.current) {
          return
        }
        // Preserve QrCodeScanError thrown by a strategy verbatim — strategies are
        // closest to the failure and may have set a more specific title / details.
        // Wrap anything else as a generic invalid-code error.
        if (err instanceof QrCodeScanError) {
          logger.error(`[ScanScreen] strategy threw QrCodeScanError: ${err.message}`)
          setScanError(err)
        } else {
          const message = err instanceof Error ? err.message : String(err)
          logger.error(`[ScanScreen] strategy threw: ${message}`)
          setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, message))
        }
      } finally {
        isProcessingRef.current = false
        setIsProcessing(false)
      }
    },
    [strategies, scanError, t, agent, logger, onConnectionFound, onPairingCodeFound]
  )

  const dismissError = useCallback(() => setScanError(null), [])

  // Call from the screen's focus effect to unlock scanning when the user
  // navigates back (e.g. closes a credential flow and reopens the scanner).
  const resetNavigationLock = useCallback(() => {
    isNavigatingRef.current = false
  }, [])

  return {
    isPermissionLoading,
    hasPermission,
    isProcessing,
    scanError,
    handleScan,
    dismissError,
    resetNavigationLock,
  }
}

export default useScanScreenViewModel

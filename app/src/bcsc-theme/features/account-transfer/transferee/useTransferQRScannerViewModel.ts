import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { QrCodeScanError } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCameraPermission } from 'react-native-vision-camera'
import useAccountTransfer from './useAccountTransfer'

const useTransferQRScannerViewModel = (navigation: StackNavigationProp<BCSCVerifyStackParams>) => {
  const { registerDevice, transferAccount } = useAccountTransfer()
  const [isLoading, setIsLoading] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const { hasPermission, requestPermission } = useCameraPermission()
  const { t } = useTranslation()
  const registrationPromiseRef = useRef<Promise<void>>(Promise.resolve())
  const isProcessingRef = useRef(false)
  const isNavigatingRef = useRef(false)

  const { isLoading: isPermissionLoading } = useAutoRequestPermission(hasPermission, requestPermission)

  useEffect(() => {
    registrationPromiseRef.current = registerDevice()
  }, [registerDevice])

  const handleScan = useCallback(
    async (value: string) => {
      // exit early if scanning already, navigating away or if an error is showing
      if (isProcessingRef.current || isNavigatingRef.current || scanError != null) {
        return
      }

      isProcessingRef.current = true
      setIsLoading(true)
      setScanError(null)

      try {
        // wait for device registration to complete before proceeding
        await registrationPromiseRef.current

        const qrParts = value.split('?')
        const transferToken = qrParts.length > 1 ? qrParts[1] : undefined
        if (!transferToken) {
          throw new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.InvalidQrCode'))
        }

        await transferAccount(value, transferToken)

        isNavigatingRef.current = true
        navigation.navigate(BCSCScreens.VerificationSuccess)
      } catch (error) {
        if (isNavigatingRef.current) {
          return
        }
        if (error instanceof QrCodeScanError) {
          setScanError(error)
        } else {
          const message = error instanceof Error ? error.message : String(error)
          setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, message))
        }
      } finally {
        isProcessingRef.current = false
        setIsLoading(false)
      }
    },
    [t, scanError, navigation, transferAccount]
  )

  const dismissError = useCallback(() => setScanError(null), [])

  return {
    isLoading,
    isPermissionLoading,
    hasPermission,
    scanError,
    handleScan,
    dismissError,
  }
}

export default useTransferQRScannerViewModel

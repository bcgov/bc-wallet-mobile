import { BCServicesCardReader, DriversLicenseMetadata } from '@/bcsc-theme/utils/decoder-strategy/DecoderStrategy'
import { BC_SERVICES_CARD_BARCODE, DRIVERS_LICENSE_BARCODE, OLD_BC_SERVICES_CARD_BARCODE } from '@/constants'
import { TOKENS, useServices } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useRef } from 'react'
import { CommonResolutions, usePhotoOutput, useVideoOutput } from 'react-native-vision-camera'
import { BarcodeFormat, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner'

interface BCServicesCardScannerOutputOptions {
  minMatches?: number
  onScanBCServicesCard: (serial: string, license: DriversLicenseMetadata) => Promise<void> | void
  onScanUnknownCard?: () => Promise<void> | void
}

export const useEvidencePhotoOutput = () => {
  return usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: 'speed',
    targetResolution: CommonResolutions.FHD_16_9, // 1080p
    containerFormat: 'jpeg',
  })
}

export const useSelfiePhotoOutput = () => {
  return usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: 'quality',
    targetResolution: CommonResolutions.FHD_16_9, // 1080p
    containerFormat: 'jpeg',
  })
}

export const useSelfieVideoOutput = () => {
  return useVideoOutput({
    fileType: 'mp4',
    targetResolution: CommonResolutions.VGA_16_9, // 480p
  })
}

export const useBCServicesCardScannerOutput = (options: BCServicesCardScannerOutputOptions) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const isProcessingScan = useRef(false)
  const bcServicesCardReaderRef = useRef(new BCServicesCardReader(logger, options.minMatches))
  const bcServicesCardReader = bcServicesCardReaderRef.current

  useFocusEffect(
    useCallback(() => {
      isProcessingScan.current = false
      bcServicesCardReaderRef.current.reset()
    }, [])
  )

  return useBarcodeScannerOutput({
    barcodeFormats: [
      BC_SERVICES_CARD_BARCODE,
      OLD_BC_SERVICES_CARD_BARCODE,
      DRIVERS_LICENSE_BARCODE,
    ] satisfies BarcodeFormat[],
    onBarcodeScanned: async (barcodes) => {
      if (isProcessingScan.current) {
        return
      }

      bcServicesCardReader.addBarcodes(barcodes)

      if (bcServicesCardReader.isBCServicesCard() === null) {
        // We haven't scanned enough barcodes yet to determine if it's a BC Services Card or not
        return
      }

      if (bcServicesCardReader.isBCServicesCard() === false && options.onScanUnknownCard) {
        // We have scanned enough barcodes to determine that it's not a BC Services Card, and we have a callback for unknown cards
        isProcessingScan.current = true
        options.onScanUnknownCard()
        return
      }

      const serial = bcServicesCardReader.getSerial()
      const license = bcServicesCardReader.getLicense()

      if (serial && license) {
        isProcessingScan.current = true
        options.onScanBCServicesCard(serial, license)
        return
      }
    },
    onError: (error) => {
      // TODO (MD): Handle errors appropriately ie: show alert
      logger.error('[BCServicesCardScanner] Error scanning barcode', error)
    },
  })
}

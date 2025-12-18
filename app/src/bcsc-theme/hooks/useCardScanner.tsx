import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useRef } from 'react'
import useApi from '../api/hooks/useApi'
import { BCSCScreens, BCSCVerifyStackParams } from '../types/navigators'
import {
  DecodedCodeKind,
  decodeScannedCode,
  DriversLicenseMetadata,
  ScanableCode,
} from '../utils/decoder-strategy/DecoderStrategy'

/**
 * Custom hook to handle card scanning logic for BCSC cards.
 *
 * API:
 * 	- scanCard: Function to handle the scanning of a card.
 * 	- handleScanComboCard: Default function to handle combo card scanning (both BCSC serial and driver's license metadata).
 * 	- handleScanBCServicesCard: Default function to handle BCSC card scanning (BCSC serial only).
 *
 * Paths:
 * 	1. Card has serial and license metadata (combo card both barcodes or 2025+ combo DL barcode)
 * 		 Outcome: validate serial -> save serial and birthdate (from license) ->? navigate to setup steps verification
 *
 *  2. Card has serial but no license metadata (BCSC card with single barcode)
 *  	 Outcome: validate serial -> save serial ->? navigate to enter birthdate
 *
 *  3. Card has only license metadata (DL card barcode)
 *  	 Outcome: navigate to manual serial entry with prefilled license metadata
 *
 *  4. Card has neither serial nor license metadata
 *  	 Outcome: unknown?
 */
export const useCardScanner = () => {
  const { authorization } = useApi()
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const scanCompletedRef = useRef(false)

  /**
   * Default handler for combo card scanning (both BCSC serial and driver's license metadata).
   *
   * @param bcscSerial - The BCSC card serial number.
   * @param license - The driver's license metadata.
   * @returns A promise that resolves when the scanning process is complete.
   */
  const handleScanComboCard = useCallback(
    async (bcscSerial: string, license: DriversLicenseMetadata) => {
      if (!license.birthDate || Number.isNaN(license.birthDate.getTime())) {
        // Should never happen, probably a decoder error
        throw new Error('handleScanComboCard: License birthdate is missing or invalid')
      }

      dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [bcscSerial] })
      dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [license.birthDate] })

      try {
        const deviceAuth = await authorization.authorizeDevice(bcscSerial, license.birthDate)
        dispatch({ type: BCDispatchAction.UPDATE_DEVICE_AUTHORIZATION, payload: [deviceAuth] })
        navigation.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] })
      } catch (error) {
        logger.error('Device authorization failed during combo card scan', error as Error)
        // TODO (MD): Use a different screen for device authorization errors. For now, use the mismatched serial screen.
        navigation.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.MismatchedSerial }],
        })
      }
    },
    [authorization, dispatch, logger, navigation]
  )

  /**
   * Default handler for BCSC card scanning (BCSC serial only).
   *
   * @param bcscSerial - The BCSC card serial number.
   * @returns A promise that resolves when the scanning process is complete.
   */
  const handleScanBCServicesCard = useCallback(
    async (bcscSerial: string) => {
      dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [bcscSerial] })
      navigation.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.EnterBirthdate }] })
    },
    [dispatch, navigation]
  )

  /**
   * Handles the scanning of a card by processing the scanned barcodes.
   *
   * Note: On iOS it make take multiple attempts to scan both barcodes on a combo card.
   * The scanning process will stop after the first successful scan to prevent duplicate processing.
   * We could improve this by setting a default minimum scan attempts or a timeout if needed.
   *
   * @param barcodes - An array of scanned barcodes.
   * @param handleScannedCardData - A callback function to handle the scanned card data.
   * @returns A promise that resolves when the scanning process is complete.
   */
  const handleCardScan = useCallback(
    async (
      barcodes: ScanableCode[],
      handleScannedCardData: (bcscSerial: string | null, license: DriversLicenseMetadata | null) => Promise<void> | void
    ) => {
      // Prevent multiple scans from being processed
      if (scanCompletedRef.current) {
        return
      }

      // Combo cards have two barcodes, so we need to process all scanned codes
      // to ensure we capture both the serial and license metadata if present
      let licenseMetadata: DriversLicenseMetadata | null = null
      let bcscSerial: string | null = null

      for (const code of barcodes) {
        const decodedCode = decodeScannedCode(code)

        if (!decodedCode) {
          logger.warn(`Failed to decode scanned barcode`, { barcode: code })
          continue
        }

        logger.debug(`Decoded barcode metadata:`, { barcodeMetadata: decodedCode })

        // Extract the decoded metadata
        switch (decodedCode.kind) {
          case DecodedCodeKind.BCServicesComboCardCardBarcode:
            bcscSerial = decodedCode.bcscSerial
            licenseMetadata = decodedCode
            break
          case DecodedCodeKind.DriversLicenseBarcode:
            licenseMetadata = decodedCode
            break
          case DecodedCodeKind.BCServicesCardBarcode:
            bcscSerial = decodedCode.bcscSerial
            break
        }
      }

      scanCompletedRef.current = true
      await handleScannedCardData(bcscSerial, licenseMetadata)
    },
    [logger]
  )

  return useMemo(
    () => ({
      scanCard: handleCardScan,
      handleScanComboCard,
      handleScanBCServicesCard,
    }),
    [handleCardScan, handleScanBCServicesCard, handleScanComboCard]
  )
}

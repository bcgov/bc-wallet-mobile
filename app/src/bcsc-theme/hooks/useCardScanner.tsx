import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
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
      if (!license.birthDate) {
        throw new Error('Birthdate is missing from license metadata')
      }

      dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [bcscSerial] })
      dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [license.birthDate] })

      try {
        const deviceAuth = await authorization.authorizeDevice(bcscSerial, license.birthDate)
        dispatch({ type: BCDispatchAction.UPDATE_DEVICE_AUTHORIZATION, payload: [deviceAuth] })
        navigation.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] })
      } catch (error) {
        navigation.reset({
          index: 0,
          routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.MismatchedSerial }],
        })
      }
    },
    [authorization, dispatch, navigation]
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
   * @param barcodes - An array of scanned barcodes.
   * @param handleScannedCardData - A callback function to handle the scanned card data.
   * @returns A promise that resolves when the scanning process is complete.
   */
  const handleCardScan = useCallback(
    async (
      barcodes: ScanableCode[],
      handleScannedCardData: (bcscSerial: string | null, license: DriversLicenseMetadata | null) => Promise<void> | void
    ) => {
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
          // TODO (MD): What to do if we can't decode the barcode? Callback?
          return
        }

        // Extract the decoded metadata
        switch (decodedCode.kind) {
          case DecodedCodeKind.BCServicesComboCardCardBarcode:
            scanCompletedRef.current = true
            bcscSerial = decodedCode.bcscSerial
            licenseMetadata = decodedCode
            break
          case DecodedCodeKind.DriversLicenseBarcode:
            scanCompletedRef.current = true
            licenseMetadata = decodedCode
            break
          case DecodedCodeKind.BCServicesCardBarcode:
            scanCompletedRef.current = true
            bcscSerial = decodedCode.bcscSerial
            break
        }
      }

      await handleScannedCardData(bcscSerial, licenseMetadata)
    },
    []
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

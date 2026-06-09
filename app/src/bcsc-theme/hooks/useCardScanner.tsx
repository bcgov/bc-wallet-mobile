import { ProvinceCode } from '@/bcsc-theme/utils/address-utils'
import { BC_SERVICES_CARD_BARCODE, DRIVERS_LICENSE_BARCODE, OLD_BC_SERVICES_CARD_BARCODE } from '@/constants'
import { isHandledAppError } from '@/errors/appError'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useRef } from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { CodeType } from 'react-native-vision-camera'
import useApi from '../api/hooks/useApi'
import { DeviceAuthorizationResponse, DeviceVerificationOption } from '../api/hooks/useAuthorizationApi'
import { VerificationCardError } from '../features/verify/verificationCardError'
import { BCSCScreens, BCSCVerifyStackParams } from '../types/navigators'
import { buildBarcodePayload } from '../utils/barcode'
import {
  DecodedCodeKind,
  decodeScannedCode,
  DriversLicenseMetadata,
  ScanableCode,
} from '../utils/decoder-strategy/DecoderStrategy'
import { getResumeStepRoute } from '../utils/resume-step-route'
import { useSecureActions } from './useSecureActions'

type DriversLicenseMetadataStub = { birthDate: Date }

/**
 * Custom hook to handle card scanning logic for BCSC cards.
 *
 * API: Includes some oppioniated default handlers for common scanning scenarios.
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
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const scannerEnabledRef = useRef(true)
  const { updateUserInfo, updateUserMetadata, updateDeviceCodes, updateCardProcess, updateVerificationOptions } =
    useSecureActions()

  /**
   * Applies a successful device authorization to secure storage and reroutes the
   * user into the setup flow. Shared by the combo (serial + birthdate) and the
   * barcodes (`/device/barcodes`) authorization paths.
   *
   * @param deviceAuth - The device authorization response from the backend.
   */
  const applyDeviceAuthorization = useCallback(
    async (deviceAuth: DeviceAuthorizationResponse, scanned: { serial: string; birthdate?: Date }) => {
      await updateUserInfo({
        email: deviceAuth.verified_email,
        isEmailVerified: !!deviceAuth.verified_email,
      })

      await updateDeviceCodes({
        deviceCode: deviceAuth.device_code,
        userCode: deviceAuth.user_code,
        deviceCodeExpiresAt: new Date(Date.now() + deviceAuth.expires_in * 1000),
      })

      await updateCardProcess(deviceAuth.process)
      await updateVerificationOptions(deviceAuth.verification_options.split(' ') as DeviceVerificationOption[])

      // Build a predicted store snapshot reflecting the dispatches above so the
      // resume route honours the freshly-set deviceCode / cardProcess / email.
      const predictedStore: BCState = {
        ...store,
        bcscSecure: {
          ...store.bcscSecure,
          serial: scanned.serial,
          birthdate: scanned.birthdate,
          emailAddress: deviceAuth.verified_email,
          isEmailVerified: !!deviceAuth.verified_email,
          deviceCode: deviceAuth.device_code,
          userCode: deviceAuth.user_code,
          deviceCodeExpiresAt: new Date(Date.now() + deviceAuth.expires_in * 1000),
          cardProcess: deviceAuth.process,
        },
      }
      navigation.reset({ index: 0, routes: [getResumeStepRoute(predictedStore)] })
    },
    [updateUserInfo, updateDeviceCodes, updateCardProcess, updateVerificationOptions, navigation, store]
  )

  /**
   * Default handler for combo card scanning (both BCSC serial and driver's license metadata).
   *
   * @param bcscSerial - The BCSC card serial number.
   * @param license - The driver's license metadata.
   * @returns `true` if authorization succeeded, `false` if silently skipped (Non-BCSC flow).
   */
  const handleScanComboCard = useCallback(
    async (bcscSerial: string, license: DriversLicenseMetadataStub): Promise<boolean> => {
      if (!license.birthDate || Number.isNaN(license.birthDate.getTime())) {
        // Should never happen, probably a decoder error
        throw new Error('handleScanComboCard: License birthdate is missing or invalid')
      }

      await updateUserInfo({ serial: bcscSerial, birthdate: license.birthDate })

      try {
        const deviceAuth = await authorization.authorizeDevice(bcscSerial, license.birthDate)
        await applyDeviceAuthorization(deviceAuth, { serial: bcscSerial, birthdate: license.birthDate })
        return true
      } catch (error) {
        if (isHandledAppError(error)) {
          return true
        }

        // In the Non-BCSC flow the camera may pick up a code-128 barcode on a
        // DL that looks like a BCSC serial but isn't valid.  Silently continue
        // so the user stays in the evidence-capture flow (matching v3 behaviour).
        if (store.bcscSecure.cardProcess === BCSCCardProcess.NonBCSC) {
          logger.info('[CardScanner] Authorization failed in Non-BCSC flow, continuing silently', {
            error: String(error),
          })
          return false
        }

        logger.error('Device authorization failed during combo card scan', error as Error)
        navigation.reset({
          index: 0,
          routes: [
            {
              name: BCSCScreens.VerificationCardError,
              params: { errorType: VerificationCardError.MismatchedSerial },
            },
          ],
        })
        return true
      }
    },
    [authorization, updateUserInfo, applyDeviceAuthorization, logger, navigation, store.bcscSecure.cardProcess]
  )

  /**
   * Non-BCSC flow handler: ask the backend whether the scanned barcodes belong
   * to a real BC Services Card via POST `/device/barcodes`. The backend owns the
   * discrimination (matching v3): a real BCSC is authorized and the user is
   * rerouted into setup; any other card (PR card, passport, …) resolves to
   * `false` so the caller keeps capturing it as evidence — no "Card not found".
   *
   * Only call this when the card presents BOTH a serial (1D) and AAMVA (2D)
   * barcode — the only combination the backend can match.
   *
   * @param bcscSerial - The serial decoded from the card's 1D (CODE_128) barcode.
   * @param license - The metadata decoded from the card's 2D (PDF-417) barcode.
   * @returns `true` if authorized as a BCSC and rerouted, `false` to continue as evidence.
   */
  const handleScanBarcodes = useCallback(
    async (bcscSerial: string, license: DriversLicenseMetadata): Promise<boolean> => {
      logger.info(
        '[CardScanner] Non-BCSC flow: querying /device/barcodes to check if the scanned card is a BC Services Card'
      )

      try {
        const deviceAuth = await authorization.authorizeDeviceWithBarcodes(buildBarcodePayload(bcscSerial, license))
        await updateUserInfo({ serial: bcscSerial, birthdate: license.birthDate })
        await applyDeviceAuthorization(deviceAuth, { serial: bcscSerial, birthdate: license.birthDate })
        logger.info('[CardScanner] Scanned card matched a BC Services Card; switching to setup')
        return true
      } catch (error) {
        // Any failure — including a handled app error — means we could not confirm
        // a BC Services Card, so stay in the evidence-capture flow rather than
        // surfacing an error (matches v3's `card_not_found → continue with non-bcsc`).
        logger.info('[CardScanner] Barcodes did not match a BC Services Card; continuing as evidence', {
          error: String(error),
        })
        return false
      }
    },
    [authorization, updateUserInfo, applyDeviceAuthorization, logger]
  )

  /**
   * Default handler for BCSC card scanning (BCSC serial only).
   *
   * @param bcscSerial - The BCSC card serial number.
   * @returns A promise that resolves when the scanning process is complete.
   */
  const handleScanBCServicesCard = useCallback(
    async (bcscSerial: string) => {
      await updateUserInfo({ serial: bcscSerial })
      navigation.reset({ index: 0, routes: [{ name: BCSCScreens.EnterBirthdate }] })
    },
    [updateUserInfo, navigation]
  )

  /**
   * Default handler for driver's license scanning (license metadata only).
   *
   * @param license - The driver's license metadata.
   * @returns A promise that resolves when the scanning process is complete.
   */
  const handleScanDriversLicense = useCallback(
    async (license: DriversLicenseMetadata) => {
      await updateUserMetadata({
        name: {
          first: license.firstName,
          last: license.lastName,
          middle: license.middleNames,
        },
        address: {
          streetAddress: license.streetAddress,
          postalCode: license.postalCode,
          city: license.city,
          province: license.province as ProvinceCode,
          country: 'CA', // currently we only support Canada licenses
        },
      })

      // Save birthdate from barcode so downstream screens can prepopulate
      if (license.birthDate && !Number.isNaN(license.birthDate.getTime())) {
        await updateUserInfo({ birthdate: license.birthDate })
      }
    },
    [updateUserMetadata, updateUserInfo]
  )

  const handleScanNonBcsc = useCallback(() => {
    navigation.navigate(BCSCScreens.DualIdentificationRequired)
  }, [navigation])

  /**
   * Starts the scanning process by setting the scan enabled flag.
   * This allows scans to be processed.
   *
   * @returns void
   */
  const startScan = () => {
    scannerEnabledRef.current = true
  }

  /**
   * Completes the scanning process by setting the scan enabled flag.
   * This prevents further scans from being processed.
   *
   * @returns void
   */
  const completeScan = () => {
    scannerEnabledRef.current = false
  }

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
      if (!scannerEnabledRef.current) {
        return
      }

      // Combo cards have two barcodes, so we need to process all scanned codes
      // to ensure we capture both the serial and license metadata if present
      let licenseMetadata: DriversLicenseMetadata | null = null
      let bcscSerial: string | null = null

      for (const code of barcodes) {
        if (__DEV__) {
          logger.debug(`[CardScanner] decoding barcode`, { code: code })
        }
        const decodedCode = decodeScannedCode(code, logger)

        if (!decodedCode) {
          // This is usually from a barcode that was partially out of frame
          logger.debug(`[CardScanner] Failed to decode scanned barcode`, { failedBarcode: code })
          continue
        }

        logger.debug(`[CardScanner] Decoded barcode metadata:`, { decodedBarcode: decodedCode })

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

      await handleScannedCardData(bcscSerial, licenseMetadata)
    },
    [logger]
  )

  return useMemo(
    () => ({
      scanCard: handleCardScan,
      startScan,
      completeScan,
      handleScanComboCard,
      handleScanBarcodes,
      handleScanBCServicesCard,
      handleScanDriversLicense,
      handleScanNonBcsc,
      codeTypes: [BC_SERVICES_CARD_BARCODE, OLD_BC_SERVICES_CARD_BARCODE, DRIVERS_LICENSE_BARCODE] satisfies CodeType[],
    }),
    [
      handleCardScan,
      handleScanBarcodes,
      handleScanBCServicesCard,
      handleScanComboCard,
      handleScanDriversLicense,
      handleScanNonBcsc,
    ]
  )
}

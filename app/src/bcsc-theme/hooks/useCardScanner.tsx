import { getProvinceCode } from '@/bcsc-theme/utils/address-utils'
import { BC_SERVICES_CARD_BARCODE, DRIVERS_LICENSE_BARCODE, OLD_BC_SERVICES_CARD_BARCODE } from '@/constants'
import { navigationRef } from '@/contexts/NavigationContainerContext'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import moment from 'moment'
import { useCallback, useMemo, useRef } from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { BarcodeFormat } from 'react-native-vision-camera-barcode-scanner'
import { DeviceAuthorizationResponse, DeviceVerificationOption } from '../api/hooks/useAuthorizationApi'
import { ScannedCard, useAuthorizationService } from '../services/hooks/useAuthorizationService'
import { BCSCScreens, BCSCVerifyStackParams } from '../types/navigators'
import { buildBarcodePayload } from '../utils/barcode'
import {
  decodeCardBarcode,
  DecodedCardBarcode,
  DriversLicenseMetadata,
  ScanableCode,
  toDriversLicenseMetadata,
} from '../utils/card-barcode-decoder'
import { combineCardBarcodes, EMPTY_CARD_SCAN } from '../utils/card-scan'
import { getResumeStepRoute } from '../utils/resume-step-route'
import { useDeviceAuthorizationRecovery } from './useDeviceAuthorizationRecovery'
import { useSecureActions } from './useSecureActions'

/**
 * Custom hook to handle card scanning logic for BCSC cards.
 *
 * API: Includes some oppioniated default handlers for common scanning scenarios.
 * 	- scanCard: Function to handle the scanning of a card.
 * 	- handleScanComboCard: Asks `/device/barcodes` about a scanned serial + card and acts on the answer.
 * 	- handleScanBarcodes: The same question, for the evidence flow; throws instead of routing on an error.
 * 	- handleScanBCServicesCard: Default function to handle BCSC card scanning (BCSC serial only).
 *
 * Paths:
 * 	1. Card has serial and license metadata (combo card both barcodes or 2025+ combo DL barcode)
 * 		 Outcome: POST /device/barcodes. A match saves the serial and birthdate and continues setup;
 * 		 `card_not_found` continues the other-ID (non-BCSC) flow; any other error is routed by its event code.
 *
 *  2. Card has serial but no license metadata (BCSC card with single barcode)
 *  	 Outcome: save serial -> navigate to enter birthdate
 *
 *  3. Card has only license metadata (DL card barcode)
 *  	 Outcome: navigate to manual serial entry with prefilled license metadata
 *
 *  4. Card has neither serial nor license metadata
 *  	 Outcome: unknown?
 */
export const useCardScanner = () => {
  const authorizationService = useAuthorizationService()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  // useCardScanner is shared between ScanSerialScreen and EvidenceCaptureScreen, so the
  // originating screen for recovery purposes is whichever one currently renders this hook.
  const route = useRoute<RouteProp<BCSCVerifyStackParams>>()
  const attemptWithRecovery = useDeviceAuthorizationRecovery()
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

  const requestBarcodeAuthorization = useCallback(
    (bcscSerial: string, license: DriversLicenseMetadata): Promise<DeviceAuthorizationResponse> => {
      logger.info('[CardScanner] Checking the scanned barcodes against /device/barcodes')

      return attemptWithRecovery(
        () =>
          authorizationService.authorizeDeviceWithBarcodes(buildBarcodePayload(bcscSerial, license), {
            skipErrorHandling: true,
          }),
        route.name
      )
    },
    [authorizationService, attemptWithRecovery, route.name, logger]
  )

  // Only a match reaches this: the serial and birth date are not stored for a card the server did not match.
  const saveMatchedCard = useCallback(
    async (bcscSerial: string, license: DriversLicenseMetadata, deviceAuth: DeviceAuthorizationResponse) => {
      await updateUserInfo({ serial: bcscSerial, birthdate: license.birthDate })
      await applyDeviceAuthorization(deviceAuth, { serial: bcscSerial, birthdate: license.birthDate })
      logger.info('[CardScanner] Scanned barcodes matched a BC Services Card; switching to setup')
    },
    [updateUserInfo, applyDeviceAuthorization, logger]
  )

  /**
   * Evidence-flow handler: ask the backend whether the scanned barcodes belong
   * to a real BC Services Card via POST `/device/barcodes`. The backend owns the
   * discrimination (matching v3): a real BCSC is authorized and the user is
   * rerouted into setup; any other card (PR card, passport, ...) throws, and the
   * caller keeps capturing it as evidence, with no "Card not found".
   *
   * Only call this when the card presents BOTH a serial (1D) and AAMVA (2D)
   * barcode, the only combination the backend can match.
   *
   * @param bcscSerial - The serial decoded from the card's 1D (CODE_128) barcode.
   * @param license - The metadata decoded from the card's 2D (PDF-417) barcode.
   * @returns true if the scanned card is a BC Services Card
   * @throws the API error when the barcodes are not matched, for the caller to handle
   */
  const handleScanBarcodes = useCallback(
    async (bcscSerial: string, license: DriversLicenseMetadata): Promise<boolean> => {
      const deviceAuth = await requestBarcodeAuthorization(bcscSerial, license)
      await saveMatchedCard(bcscSerial, license, deviceAuth)
      return true
    },
    [requestBarcodeAuthorization, saveMatchedCard]
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
      const province = getProvinceCode(license.province)

      await updateUserMetadata({
        name: {
          first: license.firstName,
          last: license.lastName,
          middle: license.middleNames,
        },
        // Only Canadian addresses are supported; leave any other address for the user to enter.
        ...(province && {
          address: {
            streetAddress: license.streetAddress,
            streetAddress2: license.streetAddress2,
            postalCode: license.postalCode,
            city: license.city,
            province,
            country: 'CA' as const,
          },
        }),
      })

      // Save birthdate from barcode so downstream screens can prepopulate
      if (license.birthDate && !Number.isNaN(license.birthDate.getTime())) {
        await updateUserInfo({ birthdate: license.birthDate })
      }
    },
    [updateUserMetadata, updateUserInfo]
  )

  const handleScanNonBcsc = useCallback(async () => {
    // Saved before navigating so the other-ID flow never starts with a stale card process.
    await updateCardProcess(BCSCCardProcess.NonBCSC)
    navigation.navigate(BCSCScreens.DualIdentificationRequired)
  }, [navigation, updateCardProcess])

  const hasLeftScanScreen = useCallback(() => {
    const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined
    return currentRoute !== undefined && currentRoute !== route.name
  }, [route.name])

  const handleBarcodeAuthorizationError = useCallback(
    async (error: unknown, scannedCard: ScannedCard): Promise<boolean> => {
      if (isAppError(error) && error.appEvent === AppEventCode.CARD_NOT_FOUND) {
        // The endpoint's contract: card_not_found means the card is not a BC Services Card, so continue as other ID.
        logger.info('[CardScanner] No BC Services Card matches the scanned barcodes; continuing with other ID')
        try {
          await handleScanNonBcsc()
          return true
        } catch (saveError) {
          logger.error('[CardScanner] Failed to start the other-ID flow', saveError as Error)
          return false
        }
      }

      if (!isAppError(error)) {
        logger.error('[CardScanner] Checking the scanned barcodes failed', error as Error)
        return false
      }

      authorizationService.handleAuthorizationError(error, scannedCard)
      // An error that only raised an alert leaves the user here, where the screen offers another try.
      return hasLeftScanScreen()
    },
    [authorizationService, handleScanNonBcsc, hasLeftScanScreen, logger]
  )

  /**
   * Handler for a scanned serial (1D) + BC card (PDF-417) pair: asks `/device/barcodes` and acts on the answer.
   *
   * - A match saves the serial and birth date, then resets to the setup route.
   * - `card_not_found` saves the non-BCSC card process and continues to the other-ID flow.
   * - Any other error is routed by its event code through the authorization service.
   *
   * @param bcscSerial - The serial decoded from the card's 1D barcode.
   * @param license - The metadata decoded from the card's PDF-417.
   * @returns `true` when the user has been moved off the scan screen; `false` when they are still on it
   * (an alert only, or a failed save) and the screen should offer another try.
   */
  const handleScanComboCard = useCallback(
    async (bcscSerial: string, license: DriversLicenseMetadata): Promise<boolean> => {
      if (!license.birthDate || Number.isNaN(license.birthDate.getTime())) {
        // Should never happen, probably a decoder error
        throw new Error('handleScanComboCard: License birthdate is missing or invalid')
      }

      let deviceAuth: DeviceAuthorizationResponse
      try {
        deviceAuth = await requestBarcodeAuthorization(bcscSerial, license)
      } catch (error) {
        return handleBarcodeAuthorizationError(error, {
          serial: bcscSerial,
          birthdate: moment(license.birthDate).format('YYYY-MM-DD'),
        })
      }

      try {
        await saveMatchedCard(bcscSerial, license, deviceAuth)
        return true
      } catch (error) {
        logger.error('[CardScanner] Failed to save a matched card', error as Error)
        return false
      }
    },
    [requestBarcodeAuthorization, handleBarcodeAuthorizationError, saveMatchedCard, logger]
  )

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
      // to ensure we capture both the serial and license metadata if present.
      // The serial comes from the 1D barcode only, never the PDF-417's DCN.
      const reads: DecodedCardBarcode[] = []

      for (const code of barcodes) {
        if (__DEV__) {
          logger.debug(`[CardScanner] decoding barcode`, { type: code.type })
        }
        const decoded = decodeCardBarcode(code)

        if (decoded.source === 'failure') {
          // This is usually from a barcode that was partially out of frame
          logger.debug(`[CardScanner] Failed to decode scanned barcode`, { type: code.type, reason: decoded.reason })
          continue
        }

        logger.debug(`[CardScanner] Decoded barcode metadata:`, { type: code.type, source: decoded.source })
        reads.push(decoded)
      }

      const scan = combineCardBarcodes(EMPTY_CARD_SCAN, reads)

      await handleScannedCardData(scan.serial, scan.card ? toDriversLicenseMetadata(scan.card) : null)
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
      codeTypes: [
        BC_SERVICES_CARD_BARCODE,
        OLD_BC_SERVICES_CARD_BARCODE,
        DRIVERS_LICENSE_BARCODE,
      ] satisfies BarcodeFormat[],
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

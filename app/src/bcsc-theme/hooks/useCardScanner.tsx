import { getProvinceCode } from '@/bcsc-theme/utils/address-utils'
import { BC_SERVICES_CARD_BARCODE, DRIVERS_LICENSE_BARCODE, OLD_BC_SERVICES_CARD_BARCODE } from '@/constants'
import { isAppError } from '@/errors/appError'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useMemo, useRef } from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { BarcodeFormat } from 'react-native-vision-camera-barcode-scanner'
import { isCardNotFoundError } from '../api/clientErrorPolicies'
import { DeviceAuthorizationResponse, DeviceVerificationOption } from '../api/hooks/useAuthorizationApi'
import { useAuthorizationService } from '../services/hooks/useAuthorizationService'
import { BCSCScreens, BCSCVerifyStackParams } from '../types/navigators'
import { buildBarcodePayload } from '../utils/barcode'
import {
  decodeCardBarcode,
  DriversLicenseMetadata,
  ScanableCode,
  toDriversLicenseMetadata,
} from '../utils/card-barcode-decoder'
import { getResumeStepRoute } from '../utils/resume-step-route'
import { useDeviceAuthorizationRecovery } from './useDeviceAuthorizationRecovery'
import { useSecureActions } from './useSecureActions'

/**
 * Custom hook to handle card scanning logic for BCSC cards.
 *
 * API: Includes some oppioniated default handlers for common scanning scenarios.
 * 	- scanCard: Function to handle the scanning of a card.
 * 	- handleScanComboCard: Asks `/device/barcodes` about a scanned serial + card and acts on the answer.
 * 	- handleScanBCServicesCard: Default function to handle BCSC card scanning (BCSC serial only).
 *
 * Paths:
 * 	1. Card has serial and license metadata (combo card both barcodes or 2025+ combo DL barcode)
 * 		 Outcome: POST /device/barcodes; a match continues setup, card_not_found goes to the other-ID flow.
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

  /**
   * Asks `/device/barcodes` whether the scanned serial + card is a BC Services Card; a match resets to setup.
   *
   * Only call this when the card presents BOTH a serial (1D) and AAMVA (2D)
   * barcode — the only combination the backend can match.
   *
   * @param bcscSerial - The serial decoded from the card's 1D (CODE_128) barcode.
   * @param license - The metadata decoded from the card's 2D (PDF-417) barcode.
   * @param isCurrent - Checked once the answer arrives; a stale answer saves nothing.
   * @returns true if the scanned card is a BC Services Card
   */
  const handleScanBarcodes = useCallback(
    async (
      bcscSerial: string,
      license: DriversLicenseMetadata,
      isCurrent: () => boolean = () => true
    ): Promise<boolean> => {
      logger.info('[CardScanner] Querying /device/barcodes for the scanned card')

      const deviceAuth = await attemptWithRecovery(
        () =>
          authorizationService.authorizeDeviceWithBarcodes(buildBarcodePayload(bcscSerial, license), {
            skipErrorHandling: true,
          }),
        route.name
      )

      if (!isCurrent()) {
        logger.debug('[CardScanner] Ignoring a match for an earlier scan')
        return false
      }

      await updateUserInfo({ serial: bcscSerial, birthdate: license.birthDate })
      await applyDeviceAuthorization(deviceAuth, { serial: bcscSerial, birthdate: license.birthDate })
      logger.info('[CardScanner] Scanned card matched a BC Services Card; switching to setup')
      return true
    },
    [authorizationService, attemptWithRecovery, route.name, updateUserInfo, applyDeviceAuthorization, logger]
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
    navigation.navigate(BCSCScreens.DualIdentificationRequired)
    await updateCardProcess(BCSCCardProcess.NonBCSC)
  }, [navigation, updateCardProcess])

  /**
   * Asks `/device/barcodes` about a scanned serial + card; card_not_found continues the other-ID flow.
   *
   * @param isCurrent - Checked once the answer arrives; a stale answer does nothing.
   * @returns `true` when acted on, `false` when dropped as stale.
   */
  const handleScanComboCard = useCallback(
    async (
      bcscSerial: string,
      license: DriversLicenseMetadata,
      isCurrent: () => boolean = () => true
    ): Promise<boolean> => {
      if (!license.birthDate || Number.isNaN(license.birthDate.getTime())) {
        // Should never happen, probably a decoder error
        throw new Error('handleScanComboCard: License birthdate is missing or invalid')
      }

      try {
        return await handleScanBarcodes(bcscSerial, license, isCurrent)
      } catch (error) {
        if (!isCurrent()) {
          logger.debug('[CardScanner] Ignoring a failed answer for an earlier scan')
          return false
        }

        if (isCardNotFoundError(error)) {
          // The endpoint's contract: card_not_found means the card is not a BC Services Card.
          await handleScanNonBcsc()
          return true
        }

        if (!isAppError(error)) {
          logger.error('[CardScanner] Checking the scanned barcodes failed', error as Error)
        }
        authorizationService.handleAuthorizationError(error)
        return true
      }
    },
    [authorizationService, handleScanBarcodes, handleScanNonBcsc, logger]
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
      // to ensure we capture both the serial and license metadata if present
      // Until the serial comes from the 1D only, a 2D DCN still sets it, and callers see it on the licence too.
      let licenseMetadata: (DriversLicenseMetadata & { bcscSerial?: string }) | null = null
      let bcscSerial: string | null = null

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

        switch (decoded.source) {
          case 'pdf417': {
            const license = toDriversLicenseMetadata(decoded.card)
            const { dcn } = decoded.card
            if (dcn) {
              bcscSerial = dcn
            }
            licenseMetadata = dcn ? { ...license, bcscSerial: dcn } : license
            break
          }
          case '1d':
            bcscSerial = decoded.serial
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

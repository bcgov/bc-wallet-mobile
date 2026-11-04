import MaskedCamera from '@/bcsc-theme/components/MaskedCamera'
import { PermissionDisabled } from '@/bcsc-theme/components/PermissionDisabled'
import PhotoReview from '@/bcsc-theme/components/PhotoReview'
import { useEvidencePhotoOutput } from '@/bcsc-theme/components/utils/camera-output'
import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useCardScanner } from '@/bcsc-theme/hooks/useCardScanner'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { buildBarcodePayload } from '@/bcsc-theme/utils/barcode'
import { DriversLicenseMetadata } from '@/bcsc-theme/utils/card-barcode-decoder'
import { isSameCardSerial } from '@/bcsc-theme/utils/card-serial'
import { getPhotoMetadata } from '@/bcsc-theme/utils/file-info'
import { isAxiosAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { BCState } from '@/store'
import { TestIds } from '@/test-ids/registry'
import { withAlert } from '@/utils/alert'
import { ScreenWrapper, testIdWithKey, TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { ComponentProps, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { BCSCCardProcess, EvidenceType, PhotoMetadata } from 'react-native-bcsc-core'
import { useCameraPermission } from 'react-native-vision-camera'
import { BarcodeScannerOutputOptions, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner'

/**
 * Builds the barcodes array for the evidence upload payload, matching the
 * v3 structure (see BarcodeData.toServerJSON in ias-ios)
 *
 * Each scanned barcode type produces one entry:
 * - Code-39 or Code-128 (BCSC serial): `{ type, value }`
 * - PDF-417 (driver's licence): `{ type, content_type, document_number, family_name, ... address }`
 *
 * ---
 *
 * CAMERA LIFECYCLE:
 * The camera unmounts while PhotoReview shows, so every side and every retake opens a new capture
 * session. EvidenceCamera creates the photo and barcode outputs along with it, because on iOS a
 * session given a previous session's outputs never starts.
 */

type EvidenceCameraProps = Omit<ComponentProps<typeof MaskedCamera>, 'photoOutput' | 'codeScanner'> & {
  scannerOptions: BarcodeScannerOutputOptions
}

/** MaskedCamera with outputs that mount and unmount with it. */
const EvidenceCamera = ({ scannerOptions, ...cameraProps }: EvidenceCameraProps) => {
  const photoOutput = useEvidencePhotoOutput()
  const codeScanner = useBarcodeScannerOutput(scannerOptions)

  return <MaskedCamera {...cameraProps} photoOutput={photoOutput} codeScanner={codeScanner} />
}

type EvidenceCaptureScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.EvidenceCapture>
  route: { params: { cardType: EvidenceType } }
}

enum CaptureState {
  CAPTURING = 'CAPTURING',
  REVIEWING = 'REVIEWING',
}

const EvidenceCaptureScreen = ({ navigation, route }: EvidenceCaptureScreenProps) => {
  const { cardType } = route.params
  const [store] = useStore<BCState>()
  const isNonBCSCFlow = store.bcscSecure.cardProcess === BCSCCardProcess.NonBCSC
  const isNonPhotoBcscFlow = store.bcscSecure.cardProcess === BCSCCardProcess.BCSCNonPhoto
  const { updateEvidenceMetadata, truncateEvidence, removeEvidenceByType } = useSecureActions()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [captureState, setCaptureState] = useState<CaptureState>(CaptureState.CAPTURING)
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string>()
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoMetadata[]>([])
  const { hasPermission, requestPermission } = useCameraPermission()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const scanner = useCardScanner()
  const bcscSerialRef = useRef<string | null>(null)
  const licenseRef = useRef<DriversLicenseMetadata | null>(null)
  // Guards against re-hitting /device/barcodes on every photo of a multi-sided
  // card — the scanned barcodes can't change once both refs are set (scanning
  // stops below), so the backend only needs to be asked once per card. A retake
  // restores it together with the barcodes it was asked about.
  const barcodesCheckedRef = useRef(false)
  // The barcodes as they stood when the last photo was accepted, restored on retake: the scanner
  // reads only until both codes are known, so what it read for a discarded shot must not carry over.
  const acceptedBarcodesRef = useRef<{
    serial: string | null
    license: DriversLicenseMetadata | null
    checked: boolean
  }>({ serial: null, license: null, checked: false })
  const { isLoading: isCameraLoading } = useAutoRequestPermission(hasPermission, requestPermission)
  const {
    failedToReadFromLocalStorageAlert,
    failedToWriteToLocalStorageAlert,
    documentExpiredAlert,
    bcscCardAlreadyAddedAlert,
  } = useAlerts(navigation)
  const scannerOptions: BarcodeScannerOutputOptions = {
    barcodeFormats: scanner.codeTypes,
    onBarcodeScanned: async (codes) => {
      if (!codes.length) {
        return
      }

      // If we have already captured both values, no need to keep scanning
      if (bcscSerialRef.current && licenseRef.current) {
        return
      }

      const scannableCodes = codes.map((code) => ({
        type: code.format,
        value: code.rawValue ?? code.displayValue,
      }))

      await scanner.scanCard(scannableCodes, async (bcscSerial, license) => {
        if (bcscSerial) {
          bcscSerialRef.current = bcscSerial
        }

        if (license) {
          licenseRef.current = license
        }
      })
    },
    onError: (error) => {
      logger.error('[EvidenceCaptureScreen] Error scanning barcode', error)
    },
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
  })

  const currentSide = cardType.image_sides[currentIndex]
  const isLastSide = currentIndex === cardType.image_sides.length - 1

  const handlePhotoTaken = (path: string) => {
    setCurrentPhotoPath(path)
    setCaptureState(CaptureState.REVIEWING)
  }

  /**
   * Decides, before a photo is accepted, what to do when the barcodes read while framing it belong
   * to a BC Services Card. Returns true when the capture must stop here: the user was rerouted into
   * that card's own setup, or the card was rejected and they were sent back to the ID list.
   *
   * @returns Whether the capture was stopped.
   */
  const resolveScannedBcscCard = async (): Promise<boolean> => {
    /**
     * Non-BCSC flow only: the user may have scanned a real BC Services Card.
     * Let the backend decide via POST /device/barcodes rather than guessing
     * client-side. Only a card presenting BOTH a serial (1D) and an AAMVA (2D)
     * barcode can match, so that's the only case we ask about. A real BCSC
     * reroutes into setup, which also settles the IDs collected so far; anything
     * else — a lone serial (e.g. a PR card's 1D barcode), a passport, a DL — falls
     * through to evidence capture with no error (matching v3 behaviour).
     *
     * In the Non-Photo BCSC flow we've already done authorizeDevice, so we skip.
     */
    if (isNonBCSCFlow && bcscSerialRef.current && licenseRef.current && !barcodesCheckedRef.current) {
      barcodesCheckedRef.current = true

      try {
        const switchedToBcsc = await scanner.handleScanBarcodes(bcscSerialRef.current, licenseRef.current, cardType)

        if (switchedToBcsc) {
          return true
        }
      } catch (error) {
        if (isAxiosAppError(error, 400) && error.cause.message === AppEventCode.CARD_EXPIRED) {
          // User scanned an expired BC Services Card.
          // Remove the last evidence entry and navigate back to the EvidenceTypeList screen
          await truncateEvidence(
            store.bcscSecure.additionalEvidenceData,
            store.bcscSecure.additionalEvidenceData.length - 1
          )
          navigation.navigate(BCSCScreens.EvidenceTypeList, { cardProcess: BCSCCardProcess.NonBCSC })
          documentExpiredAlert()
          return true
        }

        // Note: Card not found is a valid error - continue with the evidence capture flow
      }
    }

    /**
     * Non-Photo BCSC flow only: the additional photo ID must be a different document from the
     * BC Services Card already registered on this device. Nothing stops that card from being
     * photographed again under a photo-ID type such as BCID, which would submit a request whose
     * only photo ID is the non-photo card itself (#4894). Its serial — the 1D barcode, or the
     * PDF-417's DCN — gives it away, so the entry is dropped before anything is stored and the
     * user is sent back to the list to choose another ID.
     */
    if (isNonPhotoBcscFlow && isSameCardSerial(bcscSerialRef.current, store.bcscSecure.serial)) {
      try {
        // By type rather than by position: the store is updated before it is persisted, so a retry
        // after a failed persist must not drop an earlier, valid ID.
        await removeEvidenceByType(cardType)
      } catch (error) {
        failedToWriteToLocalStorageAlert(error)
        return true
      }

      // merge keeps the list's photo filter as the user left it
      navigation.navigate({
        name: BCSCScreens.EvidenceTypeList,
        params: { cardProcess: BCSCCardProcess.BCSCNonPhoto },
        merge: true,
      })
      bcscCardAlreadyAddedAlert()
      return true
    }

    return false
  }

  /**
   * Handles accepting the captured photo and proceeding to the next step.
   *
   * @returns A promise that resolves when the process is complete.
   */
  const handleAcceptPhoto = async () => {
    if (!currentPhotoPath || !currentSide) {
      return
    }

    if (await resolveScannedBcscCard()) {
      return
    }

    /**
     * Driver's License
     * Additional evidence: Required
     * Next Step: Navigate to evidence ID collection (after all photos captured)
     */
    if (licenseRef.current) {
      scanner.handleScanDriversLicense(licenseRef.current)
    }

    // Wrap getPhotoMetadata with alert
    const getPhotoMetadataWithAlert = withAlert(getPhotoMetadata, failedToReadFromLocalStorageAlert)
    const photoMetadata = await getPhotoMetadataWithAlert(currentPhotoPath, logger)
    photoMetadata.label = currentSide.image_side_name
    // Key by side index: re-accepting or retaking an already-captured side
    // (e.g. after navigating back from EvidenceIDCollection) replaces it
    // instead of appending a duplicate — see issue #4159.
    const newPhotos = [...capturedPhotos]
    newPhotos[currentIndex] = photoMetadata
    setCapturedPhotos(newPhotos)
    // The photo is kept, and with it whatever the scanner read while framing it.
    acceptedBarcodesRef.current = {
      serial: bcscSerialRef.current,
      license: licenseRef.current,
      checked: barcodesCheckedRef.current,
    }

    if (isLastSide) {
      // Build barcode payload to include in the single dispatch alongside photo metadata.
      // This avoids stale-closure issues from calling two store updates back-to-back.
      const barcodes = buildBarcodePayload(bcscSerialRef.current, licenseRef.current)
      await updateEvidenceMetadata(cardType, newPhotos, barcodes.length > 0 ? barcodes : undefined)

      // All photos captured → go to the form screen. push (not navigate) so a previously-completed
      // ID's EvidenceIDCollection already in the stack isn't reused (which would show its data); the
      // capture/instruction screens stay in the history so the user can step back through them.
      navigation.push(BCSCScreens.EvidenceIDCollection, {
        cardType,
        documentNumber: licenseRef.current?.licenseNumber,
      })
      return
    }

    // Move to next side
    setCurrentIndex((prev) => prev + 1)
    setCaptureState(CaptureState.CAPTURING)
    setCurrentPhotoPath(undefined)
  }

  const handleRetakePhoto = () => {
    // Forget what the scanner read for the discarded shot. It reads only until both codes are known,
    // so a code from this shot would otherwise be judged, and uploaded, with the next one.
    const { serial, license, checked } = acceptedBarcodesRef.current
    bcscSerialRef.current = serial
    licenseRef.current = license
    barcodesCheckedRef.current = checked
    setCaptureState(CaptureState.CAPTURING)
    setCurrentPhotoPath(undefined)
  }

  if (!currentSide) {
    // needs to throw an error instead...
    return <></>
  }

  if (isCameraLoading) {
    return <LoadingScreen />
  }

  if (!hasPermission) {
    return <PermissionDisabled permissionType="camera" />
  }

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={['top']}>
      {captureState === CaptureState.CAPTURING ? (
        <View style={styles.container} testID={testIdWithKey(TestIds.verify.evidenceCapture.maskedCamera)}>
          <EvidenceCamera
            navigation={navigation}
            cameraFace={'back'}
            cameraInstructions={currentSide.image_side_tip}
            cameraLabel={currentSide.image_side_label}
            onPhotoTaken={handlePhotoTaken}
            scannerOptions={scannerOptions}
          />
        </View>
      ) : (
        <PhotoReview photoPath={currentPhotoPath!} onAccept={handleAcceptPhoto} onRetake={handleRetakePhoto} />
      )}
    </ScreenWrapper>
  )
}

export default EvidenceCaptureScreen

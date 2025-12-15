import { useCallback, useMemo, useRef } from 'react'
import {
  DecodedCodeKind,
  decodeScannedCode,
  DriversLicenseMetadata,
  ScanableCode,
} from '../utils/decoder-strategy/DecoderStrategy'

// Paths:
// 	1. Card has serial and license metadata (combo card both barcodes or 2025+ combo DL barcode)
// 		 Outcome: validate serial -> save serial and birthdate (from license) ->? navigate to setup steps verification
//
//  2. Card has serial but no license metadata (BCSC card with single barcode)
//  	 Outcome: validate serial -> save serial ->? navigate to enter birthdate
//
//  3. Card has only license metadata (DL card barcode)
//  	 Outcome: navigate to manual serial entry with prefilled license metadata
//
//  4. Card has neither serial nor license metadata
//  	 Outcome: continue scanning until max attempts reached

export const useCardScanner = () => {
  const bcscSerialRef = useRef<string | null>()
  const license = useRef<DriversLicenseMetadata | null>(null)
  const scanCompletedRef = useRef(false)

  const handleCardScan = useCallback(
    async (
      barcodes: ScanableCode[],
      handleScanComboCard?: (bcscSerial: string, license: DriversLicenseMetadata) => Promise<void> | void,
      handleScanBCServicesCard?: (bcscSerial: string) => Promise<void> | void,
      handleScanDriversLicense?: (license: DriversLicenseMetadata) => Promise<void> | void
    ) => {
      console.log(barcodes)

      if (scanCompletedRef.current) {
        return
      }

      for (const code of barcodes) {
        const decodedCode = decodeScannedCode(code)

        if (!decodedCode) {
          // TODO (MD): What to do if we can't decode the barcode?
          return
        }

        // Extract the decoded metadata
        switch (decodedCode.kind) {
          case DecodedCodeKind.BCServicesComboCardCardBarcode:
            bcscSerialRef.current = decodedCode.bcscSerial
            license.current = decodedCode
            break
          case DecodedCodeKind.DriversLicenseBarcode:
            license.current = decodedCode
            break
          case DecodedCodeKind.BCServicesCardBarcode:
            bcscSerialRef.current = decodedCode.bcscSerial
            break
        }
      }

      const bcscSerial = bcscSerialRef.current
      const licenseMetadata = license.current

      if (handleScanComboCard && bcscSerial && licenseMetadata) {
        scanCompletedRef.current = true
        await handleScanComboCard(bcscSerial, licenseMetadata)
        return
      }

      if (handleScanBCServicesCard && bcscSerial) {
        scanCompletedRef.current = true
        await handleScanBCServicesCard(bcscSerial)
        return
      }

      if (handleScanDriversLicense && licenseMetadata) {
        scanCompletedRef.current = true
        await handleScanDriversLicense(licenseMetadata)
        return
      }
    },
    []
  )

  return useMemo(
    () => ({
      scanCard: handleCardScan,
    }),
    [handleCardScan]
  )
}

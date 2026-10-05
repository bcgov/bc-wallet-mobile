import { PAIRING_CODE_LENGTH } from '@/constants'
import { QrCodeScanError } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeStrategy } from '../useQRScanner'

// Pairing QRs encode a landing-page URL with the code in the fragment, e.g.
// https://idsit.gov.bc.ca/static/pairingqrcode.html#SKGAZZ
// Host varies across environments, so we anchor on the path + fragment shape.
const PAIRING_QR_PATH = /pairingqrcode\.html$/i
const PAIRING_CODE_FRAGMENT = new RegExp(`^[A-Z0-9]{${PAIRING_CODE_LENGTH}}$`)

export const extractPairingCode = (uri: string): string | null => {
  try {
    const url = new URL(uri)
    if (!PAIRING_QR_PATH.test(url.pathname)) {
      return null
    }
    const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
    return PAIRING_CODE_FRAGMENT.test(fragment) ? fragment : null
  } catch {
    return null
  }
}

export const usePairingCodeQRCodeStrategy = (onSuccess: (pairingCode: string) => void): QRCodeStrategy => {
  const { t } = useTranslation()

  const matches = useCallback((uri: string): boolean => {
    return extractPairingCode(uri) !== null
  }, [])

  const handle = useCallback(
    async (uri: string): Promise<void> => {
      const code = extractPairingCode(uri)

      if (!code) {
        throw new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'))
      }

      onSuccess(code)
    },
    [onSuccess, t]
  )

  return useMemo(() => ({ matches, handle }), [matches, handle])
}

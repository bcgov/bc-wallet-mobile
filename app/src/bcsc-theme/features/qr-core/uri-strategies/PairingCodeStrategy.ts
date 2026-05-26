import { PAIRING_CODE_LENGTH } from '@/constants'

import type { ScanContext, ScanResult, UriStrategy } from './types'

// Pairing QRs encode a landing-page URL with the code in the fragment, e.g.
//   https://idsit.gov.bc.ca/static/pairingqrcode.html#SKGAZZ
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

const PairingCodeStrategy: UriStrategy = {
  name: 'pairing-code',

  matches(uri) {
    return extractPairingCode(uri) !== null
  },

  async handle(uri, ctx: ScanContext): Promise<ScanResult> {
    const code = extractPairingCode(uri)
    if (!code) {
      ctx.logger.warn('[PairingCodeStrategy] matched but failed to extract code')
      return { kind: 'unrecognized' }
    }
    return { kind: 'pairing-code', pairingCode: code }
  },
}

export default PairingCodeStrategy

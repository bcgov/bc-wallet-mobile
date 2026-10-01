import type { ScanResult, UriStrategy } from './types'

// Transfer QRs encode the old device's transfer JWT as the query string, e.g.
//   https://id.gov.bc.ca/static/selfsetup.html?<jwt>
const TRANSFER_QR_PATH = /selfsetup\.html$/i

export const extractTransferToken = (uri: string): string | null => {
  try {
    const url = new URL(uri)
    if (!TRANSFER_QR_PATH.test(url.pathname)) {
      return null
    }
    const transferToken = url.search.startsWith('?') ? url.search.slice(1) : url.search
    return transferToken || null
  } catch {
    return null
  }
}

const AccountTransferStrategy: UriStrategy = {
  name: 'account-transfer',

  matches(uri) {
    return extractTransferToken(uri) !== null
  },

  async handle(uri, ctx): Promise<ScanResult> {
    const transferToken = extractTransferToken(uri)

    if (!transferToken) {
      ctx.logger.warn('[AccountTransferStrategy] matched but failed to extract transferToken')
      return { kind: 'unrecognized' }
    }

    return { kind: 'account-transfer', transferToken }
  },
}

export default AccountTransferStrategy

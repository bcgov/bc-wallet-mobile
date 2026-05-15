import type { ScanContext, ScanResult, UriStrategy } from './types'

// Pairing-code QR codes carry a short alphanumeric code (typically the same
// shape ManualPairing accepts). The actual handler that surfaces this into
// the PairingCode tab is tracked in #3838 — this stub just exercises the
// multi-strategy seam so #3838 only adds a body.
const PAIRING_CODE_PATTERN = /^[A-Z0-9]{6,12}$/

export const isPairingCode = (value: string): boolean => PAIRING_CODE_PATTERN.test(value.trim())

const PairingCodeStrategy: UriStrategy = {
  name: 'pairing-code',

  matches(uri) {
    return isPairingCode(uri)
  },

  async handle(_uri, ctx: ScanContext): Promise<ScanResult> {
    ctx.logger.info('[PairingCodeStrategy] pairing-code QR detected — handler pending (#3838)')
    // Surface as `unsupported` so the user sees a "pending" message instead of the
    // generic "QR code not recognized" surfaced for truly unknown codes. #3838 will
    // replace this with a real `connection`-style result.
    return { kind: 'unsupported', reason: 'PairingCodePending' }
  },
}

export default PairingCodeStrategy

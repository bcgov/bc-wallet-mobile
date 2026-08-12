/**
 * Smoke-test the issuer API client with NO device attached: `yarn issuer:smoke`
 * (needs ISSUER_TENANT_ID + ISSUER_API_KEY in e2e/.env.e2e — see ../issuer/README.md).
 *
 * Exercises: config resolution → tenant bearer auth (/status or its /tenant fallback) → invitation
 * minting (https — what a Sauce device must reach) → deep-link shaping → and (unless a wallet
 * actually connects within the short budget) the connection poller's TIMEOUT copy — proving the
 * failure message a red journey would show is actionable. Prints the deep link so a dev build on a
 * simulator/emulator can be pointed at it by hand.
 */
import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createInvitation,
  describeError,
  getIssuerConfig,
  getIssuerStatus,
  getTenantInfo,
  toWalletDeepLink,
  waitForConnectionActive,
} from '../src/api/index.js'

// Standalone script: load e2e/.env.e2e ourselves (wdio does this for journeys); real env always wins.
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env.e2e') })

const CONNECT_PROBE_BUDGET_MS = 8_000

async function main(): Promise<void> {
  const config = getIssuerConfig()
  console.log(`[issuer-smoke] tenant proxy: ${config.baseUrl}`)

  const status = await getIssuerStatus()
  console.log(`[issuer-smoke] status ok: ${status.label} ${status.version}`)
  const tenant = await getTenantInfo()
  console.log(`[issuer-smoke] tenant "${tenant.tenantName}" → ledger ${tenant.ledgerId}`)

  const invitation = await createInvitation({ label: 'BC Wallet E2E Issuer (smoke)' })
  // The invitation endpoint is what devices POST DIDComm to — release builds require https.
  if (!invitation.invitationUrl.startsWith('https://')) {
    throw new Error(`invitation endpoint is not https (release builds refuse it): ${invitation.invitationUrl}`)
  }
  const deepLink = toWalletDeepLink(invitation.invitationUrl)
  if (!deepLink.startsWith('bcwallet://aries_connection_invitation?oob=')) {
    throw new Error(`unexpected deep-link shape: ${deepLink}`)
  }
  console.log(`[issuer-smoke] invitation minted (oob ${invitation.oobId})`)
  console.log(`[issuer-smoke] paste into a dev build to connect manually:\n  ${deepLink}`)

  console.log(`[issuer-smoke] probing the connection poller (expected to time out in ${CONNECT_PROBE_BUDGET_MS}ms)…`)
  try {
    const { connectionId } = await waitForConnectionActive({
      invitationMsgId: invitation.invitationMsgId,
      timeoutMs: CONNECT_PROBE_BUDGET_MS,
    })
    console.log(`[issuer-smoke] a wallet actually connected: ${connectionId}`)
  } catch (error) {
    const message = describeError(error)
    if (!message.includes('Timed out')) throw error
    console.log(`[issuer-smoke] poller timeout copy as expected:\n  ${message}`)
  }

  console.log('[issuer-smoke] PASS')
}

try {
  await main()
} catch (error) {
  console.error(`[issuer-smoke] FAILED: ${describeError(error)}`)
  process.exit(1)
}

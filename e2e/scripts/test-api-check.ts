/**
 * Preflight for the IAS E2E Test API client (src/api/ias-test.ts): `yarn test-api:check`.
 *
 * Mints a token, checks it holds both scopes, then sends a counter approval for a usercode that does
 * not exist, which creates nothing, to learn what the host's build serves. Locally it proves the
 * IAS_TEST_API_* values in e2e/.env.e2e; in CI (e2e.yml, when approvals go through the API) it fails
 * by name before any Sauce session is paid for. Exits non-zero unless the decision route is live.
 */
import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  decideVerification,
  describeError,
  getGrantedScopes,
  getIasTestApiConfig,
  IAS_TEST_API_SCOPES,
  IasTestApiError,
} from '../src/api/index.js'

// Standalone script: load e2e/.env.e2e ourselves (wdio does this for journeys); real env always wins.
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env.e2e') })

/** Eight alphanumerics no registration carries. */
const PROBE_USERCODE = 'E2EPROBE'

const log = (message: string): void => console.log(`[test-api-check] ${message}`)

/** What the decision route's answer to the probe says about the build; throws unless the route is live. */
async function probeDecisionRoute(): Promise<void> {
  try {
    await decideVerification(PROBE_USERCODE, 'COUNTER', 'APPROVE')
  } catch (error) {
    if (!(error instanceof IasTestApiError)) throw error
    if (error.kind === 'unknown-usercode') {
      log('decision route live: the probe usercode was refused as unknown')
      return
    }
    if (error.kind === 'route-absent') {
      throw new Error('this host runs the draft build: it has no POST /verifications/{usercode}/decision (403)')
    }
    if (error.kind === 'not-implemented') {
      throw new Error('the decision route is served, but counter decisions are not implemented on this build (501)')
    }
    throw error
  }
  throw new Error('the probe usercode was accepted: it should not exist on any host')
}

async function main(): Promise<void> {
  log(`host: ${getIasTestApiConfig().origin}`)

  const granted = await getGrantedScopes()
  const missing = IAS_TEST_API_SCOPES.filter((scope) => !granted.includes(scope))
  if (missing.length > 0) {
    throw new Error(`the token lacks ${missing.join(' and ')}: ask IAS to grant the client both scopes`)
  }
  log(`token minted with ${IAS_TEST_API_SCOPES.join(' and ')}`)

  await probeDecisionRoute()
  log('PASS')
}

try {
  await main()
} catch (error) {
  const message = describeError(error)
  console.error(`[test-api-check] FAILED: ${message}`)
  if (process.env.GITHUB_ACTIONS) console.log(`::error::Test API preflight: ${message}`)
  process.exit(1)
}

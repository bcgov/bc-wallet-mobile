/**
 * Mints BCSC login pairing artifacts by replaying the web-browser flow from
 * Node. Two variants share the same SAML/cardtap setup and only differ in
 * the final PUT to /device:
 *
 *   - `fetchPairingCode()` returns the six-letter manual pairing code, used
 *     by the login-from-computer spec.
 *   - `fetchPairingDeepLink()` returns a fully-formed `<scheme>://pair/...`
 *     URL, used by the deep-link spec to invoke the app via Appium
 *     `mobile: deepLink`.
 *
 * Pinned to SIT (idsit.gov.bc.ca), same as every other automated BCSC
 * helper in this repo — the test users in e2e/assets/USERS.md only exist
 * there. `assertSitEnv` reads app/.env and throws early if the app under
 * test is built for any other environment, so the failure shows up before
 * we hit the pairing screen.
 *
 * Impersonates the "BC Parks Discover Camping" demo relying party
 * (clientId `urn:ca:bc:gov:demo:rp1`).
 *
 * Captured from the real browser flow:
 *   1. GET  /demo/rp1/login         → scrape SAMLRequest + RelayState
 *   2. POST /login/saml2            → 302, Location points at the login entry
 *   3. GET  {Location}              → scrape cardtap transaction UUID
 *   4. POST /cardtap/v3/transactions/{uuid}?clientId=...   → opens transaction
 *   5. PUT  /cardtap/v3/transactions/{uuid}/device         → returns pairing artifacts
 *
 * The deep-link variant additionally appends `&maxTouchPoints=1` to step 4
 * and sends `{"deviceType":"LOCAL_APP_SWITCH"}` in step 5 with a
 * mobile-Safari User-Agent — that combination causes the demo site to
 * select the LOCAL_APP_SWITCH device path and embed a `handlerURI` in the
 * response.
 */
import { type CheerioAPI, load } from 'cheerio'
import makeFetchCookie from 'fetch-cookie'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CookieJar } from 'tough-cookie'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const APP_ENV_PATH = path.resolve(SCRIPT_DIR, '../../../app/.env')

const SIT_BASE = 'https://idsit.gov.bc.ca'
const DEMO_RP_LOGIN = `${SIT_BASE}/demo/rp1/login`
const SAML2_POST = `${SIT_BASE}/login/saml2`
const CLIENT_ID = 'urn:ca:bc:gov:demo:rp1'

const USER_AGENT = 'bc-wallet-mobile-e2e/1.0 (+pairing-code-helper)'
// Mobile UAs picked so the demo site (a) chooses LOCAL_APP_SWITCH (with a
// `handlerURI`) over the desktop remote-pairing-code flow and (b) embeds
// the platform-matching custom URL scheme — iPhone UA → iOS bcsc-dev
// scheme `ca.bc.gov.iddev.servicescard`; Pixel UA → Android bcsc-dev
// scheme `ca.bc.gov.id.servicescard.dev`.
const IOS_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
const ANDROID_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36'
const DEFAULT_TIMEOUT_MS = 20_000

export type DeepLinkPlatform = 'ios' | 'android'

export interface PairingSession {
  transactionId: string
  pairingCode: string
  clientName: string
}

export interface PairingDeepLinkSession extends PairingSession {
  /** Fully-formed deep link, ready to dispatch via Appium `mobile: deepLink`. */
  deepLink: string
  /** URL scheme (without `://`) the demo site selected for this UA, e.g. `ca.bc.gov.iddev.servicescard`. */
  scheme: string
}

export interface FetchPairingCodeOptions {
  timeoutMs?: number
}

export interface FetchPairingDeepLinkOptions extends FetchPairingCodeOptions {
  /**
   * Mobile platform UA to send. The demo site picks the matching custom URL
   * scheme based on this — must align with the device the deep link will
   * be dispatched to or the OS will refuse to resolve it.
   */
  platform: DeepLinkPlatform
}

interface CardtapTransactionContext {
  transactionId: string
  entryUrl: string
  clientName: string
  fetchWithCookies: typeof fetch
  signal: AbortSignal
  userAgent: string
}

export async function fetchPairingCode(options: FetchPairingCodeOptions = {}): Promise<PairingSession> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const tx = await mintCardtapTransaction({ userAgent: USER_AGENT, signal: controller.signal })

    // Select BC Services Card app as the pairing device. Response body
    // carries the six-letter pairing code we type into the app.
    const deviceBody = await putCardtapDevice<{ pairingCode?: string }>(tx, {
      deviceType: 'REMOTE_PAIRING_CODE',
      mobileSdkParams: null,
    })
    if (!deviceBody.parsed?.pairingCode) {
      throw new Error(`pairingCode missing from cardtap device response: ${deviceBody.raw.slice(0, 200)}`)
    }

    return {
      transactionId: tx.transactionId,
      pairingCode: deviceBody.parsed.pairingCode,
      clientName: tx.clientName,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Mints a `<scheme>://pair/...` deep link by replaying the mobile-browser
 * demo flow. The PUT response embeds a `selectedDevice.handlerURI` of the
 * form `<scheme>://pair/<URL-encoded HTTPS path>/<service title>/`;
 * concatenating the returned `pairingCode` produces the full link the
 * device should resolve.
 *
 * The server picks the custom URL scheme by UA — pass `platform: 'ios'` to
 * get `ca.bc.gov.iddev.servicescard`, `'android'` for
 * `ca.bc.gov.id.servicescard.dev`. Both match the bcsc-dev variant.env
 * declarations in `variants/bcsc-dev/variant.env`.
 */
export async function fetchPairingDeepLink(options: FetchPairingDeepLinkOptions): Promise<PairingDeepLinkSession> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, platform } = options
  const userAgent = platform === 'ios' ? IOS_USER_AGENT : ANDROID_USER_AGENT
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const tx = await mintCardtapTransaction({
      userAgent,
      signal: controller.signal,
      // The live mobile flow always sends maxTouchPoints — the cardtap UI
      // uses it to decide whether to surface the LOCAL_APP_SWITCH tile.
      cardtapQueryExtras: { maxTouchPoints: '1' },
    })

    const deviceBody = await putCardtapDevice<{
      pairingCode?: string
      selectedDevice?: { handlerURI?: string }
    }>(tx, { deviceType: 'LOCAL_APP_SWITCH' })

    const pairingCode = deviceBody.parsed?.pairingCode
    const handlerUri = deviceBody.parsed?.selectedDevice?.handlerURI
    if (!pairingCode || !handlerUri) {
      throw new Error(
        `pairingCode or selectedDevice.handlerURI missing from cardtap device response: ${deviceBody.raw.slice(0, 200)}`
      )
    }

    // handlerURI ends in `/`, e.g. `ca.bc.gov.iddev.servicescard://pair/https%3A%2F%2F.../device/BC+Parks+Discover+Camping/`
    const deepLink = `${handlerUri}${pairingCode}`
    const schemeMatch = /^([^:]+):\/\//.exec(handlerUri)
    if (!schemeMatch) {
      throw new Error(`Unable to parse scheme from handlerURI: ${handlerUri}`)
    }

    return {
      transactionId: tx.transactionId,
      pairingCode,
      clientName: tx.clientName,
      deepLink,
      scheme: schemeMatch[1],
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

interface MintTransactionOptions {
  userAgent: string
  signal: AbortSignal
  /** Extra query string params appended to the POST cardtap transaction call. */
  cardtapQueryExtras?: Record<string, string>
}

/**
 * Walks the SAML/login-entry/cardtap-open sequence and returns the live
 * transaction context. Shared between the manual-pairing-code and
 * deep-link variants — they only diverge at the final PUT to /device.
 */
async function mintCardtapTransaction({
  userAgent,
  signal,
  cardtapQueryExtras,
}: MintTransactionOptions): Promise<CardtapTransactionContext> {
  assertSitEnv()
  const jar = new CookieJar()
  const fetchWithCookies = makeFetchCookie(fetch, jar)
  const headers = baseHeaders(userAgent)

  // 1. Demo RP login page — server returns an auto-submit SAML form.
  const rpLoginRes = await fetchWithCookies(DEMO_RP_LOGIN, {
    redirect: 'manual',
    headers,
    signal,
  })
  const rpLoginHtml = await readBodyOrThrow('GET /demo/rp1/login', rpLoginRes)
  const $rpLogin = load(rpLoginHtml)
  const samlRequest = inputValue($rpLogin, 'SAMLRequest')
  const relayState = inputValue($rpLogin, 'RelayState')
  if (!samlRequest) {
    throw new Error(`SAMLRequest input not found in ${DEMO_RP_LOGIN}`)
  }

  // 2. Post the SAML form. Expect 302 with Location pointing at the login entry page.
  const samlBody = new URLSearchParams({ SAMLRequest: samlRequest })
  if (relayState) samlBody.append('RelayState', relayState)
  const samlRes = await fetchWithCookies(SAML2_POST, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: SIT_BASE,
      Referer: DEMO_RP_LOGIN,
    },
    body: samlBody.toString(),
    signal,
  })
  if (samlRes.status !== 302) {
    throw new Error(`POST /login/saml2 expected 302, got ${samlRes.status}`)
  }
  const entryLocation = samlRes.headers.get('location')
  if (!entryLocation) {
    throw new Error('POST /login/saml2 returned 302 with no Location header')
  }
  const entryUrl = new URL(entryLocation, SIT_BASE).toString()

  // 3. Follow the 302 to the login entry page. Server embeds the cardtap
  //    transaction UUID as a JS literal — scrape it.
  const entryRes = await fetchWithCookies(entryUrl, {
    redirect: 'manual',
    headers: {
      ...headers,
      Referer: DEMO_RP_LOGIN,
    },
    signal,
  })
  const entryHtml = await readBodyOrThrow(`GET ${entryUrl}`, entryRes)
  const transactionId = extractTransactionId(entryHtml)
  if (!transactionId) {
    throw new Error(`transactionID not found in ${entryUrl}`)
  }

  // 4. Open the cardtap transaction. Response carries client metadata
  //    (name, device options); callers may use clientName for log output.
  const extraQuery = cardtapQueryExtras
    ? Object.entries(cardtapQueryExtras)
        .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('')
    : ''
  const txUrl = `${SIT_BASE}/cardtap/v3/transactions/${transactionId}?clientId=${encodeURIComponent(
    CLIENT_ID
  )}${extraQuery}`
  const txRes = await fetchWithCookies(txUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: SIT_BASE,
      Referer: entryUrl,
    },
    signal,
  })
  const txBodyRaw = await readBodyOrThrow('POST cardtap transaction', txRes)
  const txBody = safeJson<{ clientName?: string }>(txBodyRaw)

  return {
    transactionId,
    entryUrl,
    clientName: txBody?.clientName ?? '',
    fetchWithCookies,
    signal,
    userAgent,
  }
}

async function putCardtapDevice<T>(
  tx: CardtapTransactionContext,
  body: Record<string, unknown>
): Promise<{ raw: string; parsed: T | null }> {
  const deviceUrl = `${SIT_BASE}/cardtap/v3/transactions/${tx.transactionId}/device`
  const deviceRes = await tx.fetchWithCookies(deviceUrl, {
    method: 'PUT',
    headers: {
      ...baseHeaders(tx.userAgent),
      'Content-Type': 'application/json',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: SIT_BASE,
      Referer: tx.entryUrl,
    },
    body: JSON.stringify(body),
    signal: tx.signal,
  })
  const raw = await readBodyOrThrow('PUT cardtap device', deviceRes)
  return { raw, parsed: safeJson<T>(raw) }
}

function baseHeaders(userAgent: string): Record<string, string> {
  return {
    'User-Agent': userAgent,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-CA,en;q=0.9',
  }
}

async function readBodyOrThrow(step: string, response: Response): Promise<string> {
  const body = await response.text()
  if (!response.ok) {
    const snippet = body.slice(0, 200).replaceAll(/\s+/g, ' ').trim()
    const detail = snippet ? ` — ${snippet}` : ''
    throw new Error(`${step} failed: HTTP ${response.status}${detail}`)
  }
  return body
}

function inputValue($: CheerioAPI, name: string): string | null {
  return $(`input[name="${name}"]`).first().attr('value') ?? null
}

function extractTransactionId(html: string): string | null {
  // Server embeds `var transactionID = "<uuid>"` in an inline script. The regex
  // tolerates single/double quotes and any declaration kind so a cosmetic
  // server-side change doesn't silently break pairing tests.
  const match = /\btransactionID\s*=\s*['"]([0-9a-fA-F-]+)['"]/.exec(html)
  return match?.[1] ?? null
}

function safeJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function assertSitEnv(): void {
  // No app/.env — dev machine hasn't applied a variant yet; assume SIT
  // (matches the rest of the e2e suite, which is also SIT-only).
  let raw: string
  try {
    raw = readFileSync(APP_ENV_PATH, 'utf8')
  } catch {
    return
  }
  const match = /^DEFAULT_ENVIRONMENT\s*=\s*['"]?([^'"\r\n]+)/m.exec(raw)
  if (!match) return
  const env = match[1].trim().toUpperCase()
  // bcsc-dev variant points at SIT too; anything else is a mismatch.
  if (env !== 'SIT' && env !== 'DEV') {
    throw new Error(
      `pairing-code helper is pinned to SIT but app/.env DEFAULT_ENVIRONMENT=${env}. ` +
        `Apply a SIT-targeted variant (e.g. yarn apply-variant bcsc-dev) before running this spec.`
    )
  }
}

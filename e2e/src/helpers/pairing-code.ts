/**
 * Mints a BCSC login pairing code by replaying the web-browser flow from
 * Node. Used by the login-from-computer spec so tests don't have to drive
 * an on-device browser.
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
 *   4. POST /cardtap/v3/transactions/{uuid}?clientId=... → opens transaction
 *   5. PUT  /cardtap/v3/transactions/{uuid}/device       → returns `pairingCode`
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
const DEFAULT_TIMEOUT_MS = 20_000

export interface PairingSession {
  transactionId: string
  pairingCode: string
  clientName: string
}

export interface FetchPairingCodeOptions {
  timeoutMs?: number
}

export async function fetchPairingCode(options: FetchPairingCodeOptions = {}): Promise<PairingSession> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options
  assertSitEnv()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const jar = new CookieJar()
    const fetchWithCookies = makeFetchCookie(fetch, jar)
    const { signal } = controller

    // 1. Demo RP login page — server returns an auto-submit SAML form.
    const rpLoginRes = await fetchWithCookies(DEMO_RP_LOGIN, {
      redirect: 'manual',
      headers: baseHeaders(),
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
        ...baseHeaders(),
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
        ...baseHeaders(),
        Referer: DEMO_RP_LOGIN,
      },
      signal,
    })
    const entryHtml = await readBodyOrThrow(`GET ${entryUrl}`, entryRes)
    const transactionId = extractTransactionId(entryHtml)
    if (!transactionId) {
      throw new Error(`transactionID not found in ${entryUrl}`)
    }

    // 4. Open the cardtap transaction. Response carries client metadata (name,
    //    device options) — we only use clientName for log output.
    const txUrl = `${SIT_BASE}/cardtap/v3/transactions/${transactionId}?clientId=${encodeURIComponent(CLIENT_ID)}`
    const txRes = await fetchWithCookies(txUrl, {
      method: 'POST',
      headers: {
        ...baseHeaders(),
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: SIT_BASE,
        Referer: entryUrl,
      },
      signal,
    })
    const txBodyRaw = await readBodyOrThrow('POST cardtap transaction', txRes)
    const txBody = safeJson<{ clientName?: string }>(txBodyRaw)

    // 5. Select BC Services Card app as the pairing device. Response body
    //    carries the six-letter pairing code we type into the app.
    const deviceUrl = `${SIT_BASE}/cardtap/v3/transactions/${transactionId}/device`
    const deviceRes = await fetchWithCookies(deviceUrl, {
      method: 'PUT',
      headers: {
        ...baseHeaders(),
        'Content-Type': 'application/json',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: SIT_BASE,
        Referer: entryUrl,
      },
      body: JSON.stringify({ deviceType: 'REMOTE_PAIRING_CODE', mobileSdkParams: null }),
      signal,
    })
    const deviceBodyRaw = await readBodyOrThrow('PUT cardtap device', deviceRes)
    const deviceBody = safeJson<{ pairingCode?: string }>(deviceBodyRaw)
    if (!deviceBody?.pairingCode) {
      throw new Error(`pairingCode missing from cardtap device response: ${deviceBodyRaw.slice(0, 200)}`)
    }

    return {
      transactionId,
      pairingCode: deviceBody.pairingCode,
      clientName: txBody?.clientName ?? '',
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

function baseHeaders(): Record<string, string> {
  return {
    'User-Agent': USER_AGENT,
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

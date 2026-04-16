/**
 * Mints a BCSC login pairing code by replaying the web-browser flow from
 * Node. Used by the login-from-computer spec so tests don't have to drive
 * an on-device browser.
 *
 * The flow targets the SIT (System Integration Testing) environment —
 * idsit.gov.bc.ca — and impersonates the "BC Parks Discover Camping"
 * demo relying party (clientId `urn:ca:bc:gov:demo:rp1`).
 *
 * Captured from the real browser flow:
 *   1. GET  /demo/rp1/login         → scrape SAMLRequest + RelayState
 *   2. POST /login/saml2            → 302 sets cookie tied to the login session
 *   3. GET  /login/entry            → scrape cardtap transaction UUID from inline JS
 *   4. POST /cardtap/v3/transactions/{uuid}?clientId=... → opens transaction
 *   5. PUT  /cardtap/v3/transactions/{uuid}/device       → returns `pairingCode`
 *
 * After step 5 the backend holds the code in `state: "pairing"` for a few
 * minutes, waiting for the mobile app to submit it via the normal pairing
 * API. The caller is expected to immediately type the returned code into
 * the app.
 */

const SIT_BASE = 'https://idsit.gov.bc.ca'
const DEMO_RP_LOGIN = `${SIT_BASE}/demo/rp1/login`
const SAML2_POST = `${SIT_BASE}/login/saml2`
const LOGIN_ENTRY = `${SIT_BASE}/login/entry`
const CLIENT_ID = 'urn:ca:bc:gov:demo:rp1'

const USER_AGENT = 'bc-wallet-mobile-e2e/1.0 (+pairing-code-helper)'

export interface PairingSession {
  transactionId: string
  pairingCode: string
  clientName: string
}

export async function fetchPairingCode(): Promise<PairingSession> {
  const jar = new CookieJar()

  // 1. Demo RP login page — server returns an auto-submit SAML form.
  const rpLoginRes = await fetch(DEMO_RP_LOGIN, {
    redirect: 'manual',
    headers: baseHeaders(jar),
  })
  jar.consume(rpLoginRes.headers)
  const rpLoginHtml = await rpLoginRes.text()
  const samlRequest = extractInputValue(rpLoginHtml, 'SAMLRequest')
  const relayState = extractInputValue(rpLoginHtml, 'RelayState')
  if (!samlRequest) {
    throw new Error(`SAMLRequest input not found in ${DEMO_RP_LOGIN}`)
  }

  // 2. Post the SAML form. Expect 302 to /login/entry with a fresh session cookie.
  const samlBody = new URLSearchParams({ SAMLRequest: samlRequest })
  if (relayState) samlBody.append('RelayState', relayState)
  const samlRes = await fetch(SAML2_POST, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      ...baseHeaders(jar),
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: SIT_BASE,
      Referer: DEMO_RP_LOGIN,
    },
    body: samlBody.toString(),
  })
  jar.consume(samlRes.headers)
  if (samlRes.status !== 302) {
    throw new Error(`POST /login/saml2 expected 302, got ${samlRes.status}`)
  }

  // 3. Follow redirect to /login/entry. Server embeds the cardtap transaction
  //    UUID as a JS literal — scrape it.
  const entryRes = await fetch(LOGIN_ENTRY, {
    redirect: 'manual',
    headers: {
      ...baseHeaders(jar),
      Referer: DEMO_RP_LOGIN,
    },
  })
  jar.consume(entryRes.headers)
  if (!entryRes.ok) {
    throw new Error(`GET /login/entry failed: ${entryRes.status}`)
  }
  const entryHtml = await entryRes.text()
  const txMatch = entryHtml.match(/var\s+transactionID\s*=\s*"([0-9a-fA-F-]+)"/)
  if (!txMatch) {
    throw new Error('transactionID literal not found in /login/entry HTML')
  }
  const transactionId = txMatch[1]

  // 4. Open the cardtap transaction. Response carries client metadata (name,
  //    device options) — we only use clientName for log output.
  const txUrl = `${SIT_BASE}/cardtap/v3/transactions/${transactionId}?clientId=${encodeURIComponent(CLIENT_ID)}`
  const txRes = await fetch(txUrl, {
    method: 'POST',
    headers: {
      ...baseHeaders(jar),
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: SIT_BASE,
      Referer: LOGIN_ENTRY,
    },
  })
  jar.consume(txRes.headers)
  if (!txRes.ok) {
    throw new Error(`POST cardtap transaction failed: ${txRes.status}`)
  }
  const txBody = (await txRes.json()) as { clientName?: string }

  // 5. Select BC Services Card app as the pairing device. Response body
  //    carries the six-letter pairing code we type into the app.
  const deviceUrl = `${SIT_BASE}/cardtap/v3/transactions/${transactionId}/device`
  const deviceRes = await fetch(deviceUrl, {
    method: 'PUT',
    headers: {
      ...baseHeaders(jar),
      'Content-Type': 'application/json',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      Origin: SIT_BASE,
      Referer: LOGIN_ENTRY,
    },
    body: JSON.stringify({ deviceType: 'REMOTE_PAIRING_CODE', mobileSdkParams: null }),
  })
  if (!deviceRes.ok) {
    throw new Error(`PUT cardtap device failed: ${deviceRes.status}`)
  }
  const deviceBody = (await deviceRes.json()) as { pairingCode?: string }
  if (!deviceBody.pairingCode) {
    throw new Error('pairingCode missing from cardtap device response')
  }

  return {
    transactionId,
    pairingCode: deviceBody.pairingCode,
    clientName: txBody.clientName ?? '',
  }
}

function baseHeaders(jar: CookieJar): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-CA,en;q=0.9',
  }
  const cookie = jar.cookieHeader()
  if (cookie) headers.Cookie = cookie
  return headers
}

function extractInputValue(html: string, name: string): string | null {
  // Matches <input ... name="X" value="..."> in either attribute order.
  const nameFirst = new RegExp(
    `<input\\b[^>]*\\bname\\s*=\\s*['"]${name}['"][^>]*\\bvalue\\s*=\\s*['"]([^'"]*)['"]`,
    'i'
  )
  const valueFirst = new RegExp(
    `<input\\b[^>]*\\bvalue\\s*=\\s*['"]([^'"]*)['"][^>]*\\bname\\s*=\\s*['"]${name}['"]`,
    'i'
  )
  const m = html.match(nameFirst) ?? html.match(valueFirst)
  return m ? (m[1] ?? null) : null
}

class CookieJar {
  private readonly store = new Map<string, string>()

  consume(headers: Headers): void {
    const raw =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : headers.get('set-cookie')
          ? [headers.get('set-cookie') as string]
          : []
    for (const line of raw) {
      const first = line.split(';', 1)[0] ?? ''
      const eq = first.indexOf('=')
      if (eq < 0) continue
      const name = first.slice(0, eq).trim()
      const value = first.slice(eq + 1).trim()
      if (name) this.store.set(name, value)
    }
  }

  cookieHeader(): string {
    return Array.from(this.store.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
  }
}

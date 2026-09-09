/**
 * The IDCheck SIT session every portal script starts from.
 *
 * IDCheck signs its agents in through BC Gov SSO (Keycloak) and Entra ID, so the sign-in is a short
 * drive of the Microsoft pages in a headless browser; everything after it is cookie-bound HTTP. The
 * signed-in jar is cached per process, and the browser reuses a persistent profile so Entra recognises
 * the device and most sign-ins go silent — which keeps the shared account off Entra's bot-detection
 * radar (see ../.notes/mfa-account-protection.md). A file-backed circuit breaker (entra-auth-guard.mjs)
 * stops before a bad config can hammer the account into a lockout.
 *
 * Credentials: IDCHECK_USER (the account's Entra sign-in name: its gov email, or <IDIR>@gov.bc.ca),
 * IDCHECK_PASSWORD, and IDCHECK_TOTP_SECRET when the account's MFA is an authenticator-app code.
 * Without the secret a push to the account's phone is waited on — fine locally, never in CI.
 */
import { load } from 'cheerio'
import makeFetchCookie from 'fetch-cookie'
import { createHmac } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { Cookie, CookieJar } from 'tough-cookie'
import { createEntraAuthGuard } from './entra-auth-guard.mjs'

export const IDCHECK_ORIGIN = 'https://idsit.gov.bc.ca'
const IDCHECK_HOME_URL = `${IDCHECK_ORIGIN}/idcheck/?`
const MICROSOFT_HOST = 'login.microsoftonline.com'
const KEYCLOAK_HOST = 'dev.loginproxy.gov.bc.ca'
/** Failure screenshots land with the suite's other reports (gitignored, uploaded by CI). */
const SCREENSHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../reports/screenshots')

/**
 * Sign-in state lives under a stable dir (not the repo) so a checkout clean or a reports wipe never
 * throws away the Entra device cookie. CI points IDCHECK_STATE_DIR at a per-job writable path.
 */
const STATE_DIR = process.env.IDCHECK_STATE_DIR || path.join(homedir(), '.idcheck-e2e')
/** The persistent Chrome profile that carries Entra's device recognition across processes. */
const PROFILE_DIR = process.env.IDCHECK_PROFILE_DIR || path.join(STATE_DIR, 'profile')
/** Chrome takes an exclusive lock on a profile dir, so parallel workers serialise the brief sign-in. */
const LOCK_DIR = `${PROFILE_DIR}.lock`
const LOCK_WAIT_MS = Number(process.env.IDCHECK_LOCK_WAIT_MS) || 60_000
const LOCK_POLL_MS = 500
const LOCK_STALE_MS = 300_000
const MAX_SIGN_IN_FAILURES = Number(process.env.IDCHECK_MFA_MAX_FAILURES) || 3
/** Latches the run after too many genuine Entra rejections, so a bad config can't trigger a lockout. */
const authGuard = createEntraAuthGuard(STATE_DIR, { maxFailures: MAX_SIGN_IN_FAILURES })

const SIGN_IN_TIMEOUT_MS = 45_000
/** A person approving a push on a phone gets longer than a script typing a code. */
const HUMAN_APPROVAL_TIMEOUT_MS = 120_000
const POLL_INTERVAL_MS = 250
/** A Microsoft page showing nothing this driver knows for this long is a block, not a slow page. */
const STUCK_AFTER_MS = 10_000
/** No single page action may outlive this, so the sign-in deadline stays the one that decides. */
const ACTION_TIMEOUT_MS = 10_000
/**
 * The Microsoft sign-in page navigates to itself several times before it settles (an SSO reload). A
 * form field is only touched once no navigation has happened for this long, so a fill and its submit
 * land on the same document instead of straddling a reload that would wipe the value.
 */
const NAV_SETTLE_MS = 800
const TOTP_STEP_S = 30
/** A code about to roll over is generated after the rollover instead. */
const TOTP_MIN_REMAINING_S = 3

/** @typedef {'silent' | 'none' | 'totp' | 'push' | 'prompt'} SignInMfa */
/** @typedef {{ fetchWithCookies: typeof fetch }} Session */
/** @type {Session | null} */
let cachedSession = null
/** What the last browser sign-in did, for the CLI check and the log line. */
let lastSignIn = {
  user: '',
  mfa: /** @type {SignInMfa} */ ('none'),
  elapsedMs: 0,
  cookieNames: /** @type {string[]} */ ([]),
}

/** Forget the cached session so the next call signs in again. */
export function invalidateIdcheckSession() {
  cachedSession = null
}

/**
 * The cookie-bound fetch every IDCheck request goes through. Reuses the process's signed-in jar when
 * IDCheck still accepts it (a probe of the home page), otherwise signs in through the browser.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<typeof fetch>}
 */
export async function establishIdcheckSession(signal) {
  if (cachedSession) {
    const landing = await probeLanding(cachedSession.fetchWithCookies, signal)
    if (isSignedIn(landing.response)) {
      return cachedSession.fetchWithCookies
    }
    console.log(`[idcheck] [~] session no longer accepted (landed on ${describeLanding(landing)}) — signing in again`)
    cachedSession = null
  }

  const jar = new CookieJar()
  const fetchWithCookies = makeFetchCookie(fetch, jar)
  await signInWithBrowser(jar, signal)
  const landing = await probeLanding(fetchWithCookies, signal)
  assertIdcheckSignedIn(landing)
  cachedSession = { fetchWithCookies }
  return fetchWithCookies
}

/**
 * A fresh sign-in followed by a read of the home page — the cheap credential and connectivity check.
 *
 * @param {AbortSignal} [signal]
 */
export async function checkIdcheckSignIn(signal) {
  invalidateIdcheckSession()
  const fetchWithCookies = await establishIdcheckSession(signal)
  const landing = await probeLanding(fetchWithCookies, signal)
  return { ...lastSignIn, landingUrl: landing.response.url, landingTitle: pageTitle(landing.html) }
}

/**
 * An unaccepted session is not an error status: IDCheck bounces to its identity provider, which
 * answers 200 with a sign-in page. Assert on where we landed, so that is named here instead of
 * surfacing later as a missing token or an empty-looking queue.
 *
 * @param {{ response: Response, html: string }} landing
 */
export function assertIdcheckSignedIn(landing) {
  if (isSignedIn(landing.response)) {
    return
  }
  const hint =
    landing.response.status === 403
      ? " — a 403 from IDCheck SIT usually means this machine's egress IP is not allowlisted"
      : ''
  throw new Error(`[idcheck] not signed in — landed on ${describeLanding(landing)}${hint}`)
}

/** A portal page on IDCheck itself: not a bounce to the identity provider, not a block or error page. */
function isSignedIn(response) {
  return response.ok && isIdcheckPage(new URL(response.url))
}

/** @param {URL} url */
function isIdcheckPage(url) {
  return url.origin === IDCHECK_ORIGIN && !url.pathname.startsWith('/idcheck/login/')
}

/** @param {{ response: Response, html: string }} landing */
function describeLanding(landing) {
  const url = new URL(landing.response.url)
  const status = landing.response.ok ? '' : `HTTP ${landing.response.status} at `
  return `${status}${url.host}${url.pathname} ("${pageTitle(landing.html) || 'untitled'}")`
}

/** The page's own title: the portal's h1 when it renders one, else the document title. */
export function pageTitle(html) {
  try {
    const $ = load(html)
    return ($('h1#page-title').first().text() || $('title').first().text()).replaceAll(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

/**
 * GET the home page through the jar, following the whole sign-in redirect chain. With the Keycloak
 * cookies in the jar this is also the cheap re-auth: an expired IDCheck session comes back with a
 * new one from Keycloak alone, and only a bounce all the way to Microsoft needs the browser.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {AbortSignal} [signal]
 */
async function probeLanding(fetchWithCookies, signal) {
  const startedAt = Date.now()
  const response = await fetchWithCookies(IDCHECK_HOME_URL, {
    headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    redirect: 'follow',
    signal,
  })
  const html = await response.text()
  const { host, pathname } = new URL(response.url)
  const where = host === new URL(IDCHECK_ORIGIN).host ? pathname : `${host}${pathname}`
  console.log(
    `[idcheck] [${response.ok ? '+' : '!'}] landing: ${response.status} ${where} (${elapsedSeconds(startedAt)}s)`
  )
  return { response, html }
}

function readCredentials() {
  const user = process.env.IDCHECK_USER
  const password = process.env.IDCHECK_PASSWORD
  if (!user || !password) {
    throw new Error(
      'Missing IDCHECK_USER or IDCHECK_PASSWORD (set them in e2e/.env.e2e or export them; CI loads them from 1Password)'
    )
  }
  return {
    user,
    password,
    totpSecret: process.env.IDCHECK_TOTP_SECRET || undefined,
    headed: process.env.IDCHECK_LOGIN_HEADED === '1',
  }
}

/**
 * Signs in through a browser and copies the resulting gov.bc.ca cookies into `jar`.
 *
 * @param {CookieJar} jar
 * @param {AbortSignal} [signal]
 */
async function signInWithBrowser(jar, signal) {
  const credentials = readCredentials()
  ensureStateDir()
  authGuard.resetIfRequested()
  authGuard.assertNotLatched() // fail fast before a bad config or a risk-flagged account signs in again
  const startedAt = Date.now()

  let result
  try {
    result = await withProfileLock(async (userDataDir, { ephemeral }) => {
      if (ephemeral) {
        console.log(
          '[idcheck] [~] the browser profile was busy — signing in with a throw-away profile (no device recognition this time)'
        )
      }
      const context = await launchPersistentBrowserContext(userDataDir, credentials.headed)
      context.setDefaultTimeout(ACTION_TIMEOUT_MS)
      // Closing the context is what turns the caller's abort into a prompt rejection of the drive below.
      const onAbort = () => context.close().catch(() => undefined)
      signal?.addEventListener('abort', onAbort, { once: true })
      const page = context.pages()[0] ?? (await context.newPage())
      try {
        await page.goto(IDCHECK_HOME_URL, { waitUntil: 'domcontentloaded' })
        const mfa = await Promise.race([driveSignIn(page, credentials), rejectOnAbort(signal)])
        await page.waitForLoadState('load').catch(() => undefined)
        const cookies = (await context.cookies()).filter((cookie) => bareDomain(cookie.domain).endsWith('gov.bc.ca'))
        for (const cookie of cookies) {
          await jar.setCookie(toToughCookie(cookie), `https://${bareDomain(cookie.domain)}${cookie.path}`)
        }
        return { mfa, cookieNames: cookies.map((cookie) => cookie.name) }
      } catch (error) {
        if (!signal?.aborted) {
          await saveScreenshot(page)
        }
        throw error
      } finally {
        signal?.removeEventListener('abort', onAbort)
        await context.close().catch(() => undefined)
      }
    })
  } catch (error) {
    // Only a genuine Entra verdict counts toward a lockout — never our own timeouts, aborts or 403s.
    if (error?.entraVerdict) {
      authGuard.recordFailure(firstLine(error))
    }
    throw error
  }

  authGuard.recordSuccess() // a healthy sign-in (silent SSO included) clears the failure budget
  lastSignIn = {
    user: credentials.user,
    mfa: result.mfa,
    elapsedMs: Date.now() - startedAt,
    cookieNames: result.cookieNames,
  }
  console.log(
    `[idcheck] [+] signed in as ${credentials.user}: ${result.mfa} MFA, ${result.cookieNames.length} cookies (${elapsedSeconds(startedAt)}s)`
  )
}

/**
 * Runs the brief browser sign-in while holding an exclusive lock on the persistent profile, since
 * Chrome refuses to open one profile twice. A worker that cannot get the lock in time signs in with a
 * throw-away profile instead — correct, just without this run's device recognition.
 *
 * @template T
 * @param {(userDataDir: string, opts: { ephemeral: boolean }) => Promise<T>} criticalSection
 * @returns {Promise<T>}
 */
async function withProfileLock(criticalSection) {
  const deadline = Date.now() + LOCK_WAIT_MS
  for (;;) {
    try {
      mkdirSync(LOCK_DIR)
      writeFileSync(path.join(LOCK_DIR, 'owner'), `${process.pid} ${Date.now()}`)
      break
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      if (reclaimStaleLock()) continue
      if (Date.now() > deadline) {
        const ephemeralDir = mkdtempSync(path.join(tmpdir(), 'idcheck-profile-'))
        try {
          return await criticalSection(ephemeralDir, { ephemeral: true })
        } finally {
          rmSync(ephemeralDir, { recursive: true, force: true })
        }
      }
      await delay(LOCK_POLL_MS)
    }
  }
  try {
    return await criticalSection(PROFILE_DIR, { ephemeral: false })
  } finally {
    rmSync(LOCK_DIR, { recursive: true, force: true })
  }
}

/** Reclaims a lock left behind by a crashed worker (nothing releases it otherwise). */
function reclaimStaleLock() {
  try {
    if (Date.now() - statSync(LOCK_DIR).mtimeMs > LOCK_STALE_MS) {
      rmSync(LOCK_DIR, { recursive: true, force: true })
      return true
    }
    return false
  } catch {
    return true // the lock vanished between EEXIST and stat — let the next mkdir try
  }
}

/** Makes the sign-in state dir, hard-failing (no silent degrade) if it cannot be written. */
function ensureStateDir() {
  try {
    mkdirSync(STATE_DIR, { recursive: true })
  } catch (error) {
    throw new Error(
      `[idcheck] cannot create the sign-in state dir ${STATE_DIR} (${firstLine(error)}) — set IDCHECK_STATE_DIR to a writable path`
    )
  }
}

/** Tags an error as a genuine Entra verdict, so the circuit breaker counts it (and timeouts are not). */
function entraError(message) {
  const error = new Error(message)
  return Object.assign(error, { entraVerdict: true })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A persistent Chrome context on `userDataDir`: Google Chrome where it is installed (dev Macs,
 * GitHub-hosted runners), else the bundled Chromium. `--disable-blink-features=AutomationControlled`
 * drops the `navigator.webdriver` tell (which Chrome can do and Firefox cannot); nothing more, since
 * over-hardening a fingerprint reads as MORE anomalous, not less.
 */
async function launchPersistentBrowserContext(userDataDir, headed) {
  const { chromium } = await import('playwright-core')
  const options = {
    headless: !headed,
    args: ['--disable-blink-features=AutomationControlled'],
    locale: 'en-US',
    viewport: { width: 1280, height: 900 },
  }
  try {
    return await chromium.launchPersistentContext(userDataDir, { ...options, channel: 'chrome' })
  } catch {
    // no branded Chrome; fall through to whatever `playwright-core install chromium` put in place
  }
  try {
    return await chromium.launchPersistentContext(userDataDir, options)
  } catch (error) {
    throw new Error(
      `[idcheck sign-in] no browser to sign in with — install Google Chrome, or run "yarn playwright-core install chromium" in e2e/ (${firstLine(error)})`
    )
  }
}

/**
 * Drives whatever sign-in page is showing until the browser is back on IDCheck. The pages come in
 * varying orders (MFA may not be asked, the method may be a push or a code, "stay signed in" may
 * not appear), so this reacts to what is visible instead of scripting one sequence.
 *
 * @param {import('playwright-core').Page} page
 * @param {{ user: string, password: string, totpSecret?: string }} credentials
 * @returns {Promise<SignInMfa>} the MFA path taken ('silent' when the profile carried the session)
 */
async function driveSignIn(page, credentials) {
  let deadline = Date.now() + SIGN_IN_TIMEOUT_MS
  let lastKnownPageAt = Date.now()
  let lastNavAt = Date.now()
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) lastNavAt = Date.now()
  })
  /** @type {SignInMfa} */
  let mfa = 'none'
  const done = { picker: false, user: false, password: false, kmsi: false, anotherWay: false, pushLogged: false }
  let codeSubmissions = 0
  let codeSubmittedAt = 0

  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(`[idcheck sign-in] timed out ${await describePage(page)}`)
    }
    const url = currentUrl(page)
    if (url && isIdcheckPage(url)) {
      const status = await documentStatus(page)
      if (status >= 400) {
        throw new Error(
          `[idcheck sign-in] IDCheck answered HTTP ${status} at ${url.pathname}${status === 403 ? " — is this machine's egress IP allowlisted for SIT?" : ''}`
        )
      }
      // Never having filled a field means the persistent profile carried the whole session — silent SSO.
      return !done.user && !done.password ? 'silent' : mfa
    }

    let acted = true
    if (url?.host === KEYCLOAK_HOST) {
      if (await visible(page, '#kc-error-message, form#kc-form-login, #kc-page-title')) {
        throw new Error(
          `[idcheck sign-in] Keycloak wants a person ${await describePage(page)} — sign in once by hand to finish first-login/account linking`
        )
      }
    } else if (url?.host === MICROSOFT_HOST && Date.now() - lastNavAt < NAV_SETTLE_MS) {
      // Still navigating (the SSO reload storm) — that IS progress, so hold off touching any field.
      acted = false
      lastKnownPageAt = Date.now()
    } else if (url?.host === MICROSOFT_HOST) {
      const risk = await riskPageText(page)
      if (risk) {
        throw entraError(
          `[idcheck sign-in] Entra is refusing this account (${risk}) — likely bot-detection / account protection; escalate to IAS, then clear the latch with IDCHECK_AUTH_RESET=1`
        )
      }
      if (await visible(page, '#usernameError')) {
        throw entraError(
          `[idcheck sign-in] Entra rejected the sign-in name "${credentials.user}" — IDCHECK_USER must be the account's UPN (the account's gov email): ${await pageText(page, '#usernameError')}`
        )
      }
      if (await visible(page, '#passwordError')) {
        throw entraError(
          `[idcheck sign-in] password rejected for ${credentials.user}: ${await pageText(page, '#passwordError')}`
        )
      }
      if (await visible(page, '#idSubmit_ProofUp_Redirect')) {
        throw entraError(
          `[idcheck sign-in] the account must finish MFA registration first (https://mysignins.microsoft.com/security-info) ${await describePage(page)}`
        )
      }
      if (await visible(page, 'input[name="newpwd"]')) {
        throw entraError(
          `[idcheck sign-in] the password for ${credentials.user} has expired — rotate it and update the secret`
        )
      }

      if (await visible(page, '#idSpan_SAOTCC_Error_OTC')) {
        // A code can be rejected for replay (two runs in one window) or drift; one fresh window is a fair retry.
        if (codeSubmissions >= 2 || !credentials.totpSecret) {
          throw entraError(
            `[idcheck sign-in] verification code rejected twice — check IDCHECK_TOTP_SECRET and the clock: ${await pageText(page, '#idSpan_SAOTCC_Error_OTC')}`
          )
        }
        await waitForNextTotpWindow(page)
        await submitCode(page, totpCode(credentials.totpSecret))
        codeSubmissions++
        codeSubmittedAt = Date.now()
      } else if (await visible(page, '#KmsiCheckboxField')) {
        if (!done.kmsi) {
          // "Stay signed in?" → Yes: Entra writes a persistent cookie the profile carries, so the next
          // process signs in silently. Fewer full sign-ins is the whole anti-lockout game.
          await page.locator('#idSIButton9').click()
          done.kmsi = true
        }
      } else if (!done.picker && (await visible(page, '#tilesHolder'))) {
        // A warm profile is offered its known accounts instead of the username field.
        await chooseAccountTile(page, credentials.user)
        done.picker = true
      } else if (!done.user && (await visible(page, 'input[name="loginfmt"]'))) {
        await submitField(page, 'input[name="loginfmt"]', credentials.user)
        done.user = true
      } else if (done.user && !done.password && (await visible(page, 'input[name="passwd"]'))) {
        await submitField(page, 'input[name="passwd"]', credentials.password)
        done.password = true
      } else if (await visible(page, 'input[name="otc"]')) {
        if (codeSubmissions === 0 || Date.now() - codeSubmittedAt > SIGN_IN_TIMEOUT_MS) {
          if (credentials.totpSecret) {
            await waitForNextTotpWindow(page)
            await submitCode(page, totpCode(credentials.totpSecret))
            mfa = 'totp'
          } else if (process.stdin.isTTY) {
            await submitCode(page, await promptForCode())
            mfa = 'prompt'
          } else {
            throw new Error('[idcheck sign-in] MFA asked for a verification code and no IDCHECK_TOTP_SECRET is set')
          }
          codeSubmissions++
          codeSubmittedAt = Date.now()
        }
      } else if (await visible(page, '#idRichContext_DisplaySign, #idDiv_SAOTCAS_Title')) {
        // The Authenticator push page: switch to a code when we can type one, else wait for the phone.
        if (credentials.totpSecret) {
          if (!done.anotherWay && (await visible(page, '#signInAnotherWay'))) {
            await page.locator('#signInAnotherWay').click()
            done.anotherWay = true
          }
        } else {
          if (!done.pushLogged) {
            const digits = (await pageText(page, '#idRichContext_DisplaySign')) || '(no number shown)'
            console.log(
              `[idcheck] [~] approve the sign-in for ${credentials.user} in Microsoft Authenticator — number ${digits}`
            )
            done.pushLogged = true
            deadline = Date.now() + HUMAN_APPROVAL_TIMEOUT_MS
          }
          mfa = 'push'
        }
      } else if (await visible(page, 'div[data-value="PhoneAppOTP"], div[data-value="PhoneAppNotification"]')) {
        // The "verify your identity" method list.
        const method = credentials.totpSecret ? 'PhoneAppOTP' : 'PhoneAppNotification'
        await page.locator(`div[data-value="${method}"]`).first().click()
      } else {
        acted = false
      }
    } else {
      acted = false
    }

    if (acted) {
      lastKnownPageAt = Date.now()
    } else if (url?.host === MICROSOFT_HOST && Date.now() - lastKnownPageAt > STUCK_AFTER_MS) {
      throw new Error(`[idcheck sign-in] stuck ${await describePage(page)}`)
    }
    await page.waitForTimeout(POLL_INTERVAL_MS)
  }
}

/**
 * Types into a sign-in field and presses the page's Next button. The caller only reaches here once the
 * page has stopped navigating, so the fill and the submit land on the same document.
 *
 * @param {import('playwright-core').Page} page
 * @param {string} selector
 * @param {string} value
 */
/**
 * On the "Pick an account" screen, clicks the tile for our user, else "Use another account" so the
 * flow reaches the username field. Race-tolerant: a stale tile click is swallowed and re-tried next poll.
 *
 * @param {import('playwright-core').Page} page
 * @param {string} user
 */
async function chooseAccountTile(page, user) {
  const tile = page
    .locator('#tilesHolder [role="button"], #tilesHolder [data-test-id="accountTile"]')
    .filter({ hasText: user })
    .first()
  if (await tile.isVisible().catch(() => false)) {
    await tile.click().catch(() => undefined)
    return
  }
  await page
    .locator('#otherTile, #otherTileText')
    .first()
    .click()
    .catch(() => undefined)
}

/** The Entra risk / account-protection surface, or '' — the signal that the account is being blocked. */
async function riskPageText(page) {
  const body = await pageText(page, 'body')
  if (/having trouble verifying your account/i.test(body)) {
    return 'trouble verifying your account'
  }
  const code = /AADSTS(50074|500121|50053)/.exec(body)
  return code ? code[0] : ''
}

async function submitField(page, selector, value) {
  await page.locator(selector).first().fill(value)
  await page.locator('#idSIButton9').first().click()
}

/** @param {import('playwright-core').Page} page @param {string} code */
async function submitCode(page, code) {
  await page.locator('input[name="otc"]').fill(code)
  const continueButton = page.locator('#idSubmit_SAOTCC_Continue')
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click()
  } else {
    await page.locator('#idSIButton9').click()
  }
}

async function promptForCode() {
  const readline = createInterface({ input: process.stdin, output: process.stderr })
  try {
    return (await readline.question('[idcheck] enter the 6-digit verification code: ')).trim()
  } finally {
    readline.close()
  }
}

/** @param {import('playwright-core').Page} page */
async function waitForNextTotpWindow(page) {
  const remaining = TOTP_STEP_S - (Math.floor(Date.now() / 1000) % TOTP_STEP_S)
  if (remaining < TOTP_MIN_REMAINING_S) {
    await page.waitForTimeout(remaining * 1000 + 200)
  }
}

/**
 * RFC 6238 code for `now` from a base32 secret (SHA-1, 30 s, 6 digits — what Entra issues).
 *
 * @param {string} secretBase32
 * @param {number} [nowMs]
 */
export function totpCode(secretBase32, nowMs = Date.now()) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(nowMs / 1000 / TOTP_STEP_S)))
  const digest = createHmac('sha1', base32Decode(secretBase32)).update(counter).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]
  return String(binary % 1_000_000).padStart(6, '0')
}

/** @param {string} input */
function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes = []
  let bits = 0
  let value = 0
  for (const char of input.toUpperCase().replaceAll(/[\s=-]/g, '')) {
    const index = alphabet.indexOf(char)
    if (index === -1) {
      throw new Error('IDCHECK_TOTP_SECRET is not a base32 secret')
    }
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
      value &= (1 << bits) - 1
    }
  }
  return Buffer.from(bytes)
}

/** Playwright's cookie shape → tough-cookie's, keeping host-only vs domain cookies apart. */
function toToughCookie(cookie) {
  return new Cookie({
    key: cookie.name,
    value: cookie.value,
    ...(cookie.domain.startsWith('.') ? { domain: bareDomain(cookie.domain) } : {}),
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    expires: cookie.expires > 0 ? new Date(cookie.expires * 1000) : 'Infinity',
    sameSite: cookie.sameSite?.toLowerCase(),
  })
}

/** @param {string} domain */
function bareDomain(domain) {
  return domain.replace(/^\./, '')
}

/** @param {import('playwright-core').Page} page */
async function saveScreenshot(page) {
  try {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    const file = path.join(SCREENSHOT_DIR, `idcheck-sign-in-${new Date().toISOString().replaceAll(/[:.]/g, '-')}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`[idcheck] [!] sign-in screenshot: ${file}`)
  } catch {
    // the failure itself is what matters; a missing screenshot is not worth a second error
  }
}

/** @param {import('playwright-core').Page} page @param {string} selector */
async function visible(page, selector) {
  return page
    .locator(selector)
    .first()
    .isVisible()
    .catch(() => false)
}

/** @param {import('playwright-core').Page} page @param {string} selector */
async function pageText(page, selector) {
  const text = await page
    .locator(selector)
    .first()
    .innerText()
    .catch(() => '')
  return text.replaceAll(/\s+/g, ' ').trim()
}

/** Where the drive is and what the page says — the tail of every sign-in error. */
async function describePage(page) {
  const url = currentUrl(page)
  const title = await page.title().catch(() => '')
  const text = (await pageText(page, 'body')).slice(0, 300)
  return `on ${url ? `${url.host}${url.pathname}` : '(no page)'} "${title}": ${text}`
}

/** The status the current document was served with (0 when the browser cannot say). */
async function documentStatus(page) {
  return page.evaluate(() => performance.getEntriesByType('navigation')[0]?.responseStatus ?? 0).catch(() => 0)
}

/** @param {import('playwright-core').Page} page */
function currentUrl(page) {
  try {
    return new URL(page.url())
  } catch {
    return null
  }
}

/** @param {AbortSignal} [signal] */
function rejectOnAbort(signal) {
  return new Promise((_, reject) => {
    if (!signal) {
      return
    }
    if (signal.aborted) {
      reject(signal.reason ?? new Error('This operation was aborted'))
      return
    }
    signal.addEventListener('abort', () => reject(signal.reason ?? new Error('This operation was aborted')), {
      once: true,
    })
  })
}

function elapsedSeconds(since) {
  return ((Date.now() - since) / 1000).toFixed(1)
}

function firstLine(error) {
  return String(error instanceof Error ? error.message : error).split('\n')[0]
}

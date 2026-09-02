import { load } from 'cheerio'
import dotenv from 'dotenv'
import makeFetchCookie from 'fetch-cookie'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CookieJar } from 'tough-cookie'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

const initialCookieHeader =
  'Dummy1=DummyVal1; BCGOVFlags=1000%3A1%2C0; BCGOVCustom=NULL; BCGOVBrand=NULL; BCGOVBehavior=NULL; Dummy2=DummyVal2; preDummy1=DummyVal1; preDummy2=DummyVal2; FAILREASON=0; BCGOVTarget=https%3A%2F%2Fidsit.gov.bc.ca%2Fidcheck%2F; BCGOVReferer=https%3A%2F%2Fidsit.gov.bc.ca%2F; SMSESSION=LOGGEDOFF; BCGOVclptryno=1; clp001=Salted__%AD%BAa.%D7L%CA%A2%5C%13%A9%B3%9F%95%F6%EDb%0D%21%8D%F6%1A%A1%B1%E7g%BEMj%C7%AD%DD%CF%B9%ED%3A%0FDB%95_%29%28c%9F%E8%8AI7%A3%2B%F5%03%80%FD3%BC%F4%1C%B5%D9E%C86'

const IDENTIFY_URL =
  'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/identify?menuItemAction=verifyMobileCardInPerson'
const VALIDATE_CARDHOLDER_URL = 'https://idsit.gov.bc.ca/idcheck/protected/validatecardholder'
const VERIFY_NON_BCSC_URL = 'https://idsit.gov.bc.ca/idcheck/protected/counterNonBcscRequest/verifyIdentity'

// Send-video submissions are reviewed by a different controller family than in-person.
const IDCHECK_ORIGIN = 'https://idsit.gov.bc.ca'
const BACKCHECK_BASE_URL = `${IDCHECK_ORIGIN}/idcheck/protected/backCheckRequest`
const BACKCHECK_DASHBOARD_URL = `${BACKCHECK_BASE_URL}/dashboard`
const BACKCHECK_CONTINUE_URL = `${BACKCHECK_BASE_URL}/continue`
const BACKCHECK_MATCHES_URL = `${BACKCHECK_BASE_URL}/matches`
const BACKCHECK_APPROVE_URL = `${BACKCHECK_BASE_URL}/approve`
const BACKCHECK_NOTE_URL = `${BACKCHECK_BASE_URL}/note`
/** Per-candidate identity data behind the match step; the page itself renders those names client-side. */
const IDMATCH_RESULT_URL = `${IDCHECK_ORIGIN}/idcheck/protected/idmatch/result`
/** A claim that took work lands on the request's own page; any other landing means the queue ran dry. */
const CLAIMED_REQUEST_URL_PATTERN = /\/backCheckRequest\/(verify|review)Identity\/[^/?#]+$/

/** The "all good" answer for every attestation radio group the review form renders. */
const AFFIRMATIVE_ANSWER = '0'
/** The one attestation answer that differs by decision: confident (approve) vs not (reject). */
const SUSPICIOUS_ACTIVITY_FIELD = 'suspiciousActivityVerificationValue'

// 22 = "additional person in photo or video", the reason used in the reference capture.
const DEFAULT_REJECT_REASON_ID = '22'
const CLAIM_POLL_INTERVAL_MS = 5_000
const DEFAULT_CLAIM_TIMEOUT_MS = 120_000

/** Page titles the review chain passes through; each one is asserted, so drift fails loudly. */
const REVIEW_READY_TITLE = 'Choose how to assist the individual'
const REJECT_NOTE_TITLE = 'Add Note to Activity Log'
const APPROVE_DONE_TITLE = 'Card Added to Mobile'
const NOTE_DONE_TITLE = 'Note Added to Activity Log'
const IDENTITY_MATCH_TITLE = 'Choose Which of These is a Match'

/**
 * Wall-clock at the previous {@link logStep}, so each line reports how long its request took. The whole
 * chain shares ONE abort budget, so a timeout names the request in flight — structurally the last one —
 * not the slow one; these timings tell them apart. Module state is safe: one wdio worker, one journey.
 */
let previousStepAt = 0

/**
 * Logs a compact summary line for a response and throws on non-2xx status.
 * Returns the response body text so callers that need it can use the return value.
 *
 * @param {string} step
 * @param {Response} response
 * @param {string} [bodyText] - Pre-read body text (if already consumed)
 * @returns {Promise<string>} The response body text
 */
async function logStep(step, response, bodyText) {
  const body = bodyText ?? (await response.text())
  const now = Date.now()
  const elapsedSeconds = previousStepAt ? ((now - previousStepAt) / 1000).toFixed(1) : '?'
  previousStepAt = now
  const pathname = new URL(response.url).pathname
  const icon = response.ok ? '+' : '!'
  console.log(`[sm-login] [${icon}] ${step}: ${response.status} ${pathname} (${elapsedSeconds}s)`)

  if (!response.ok) {
    const errorDetail = extractErrorMessage(body)
    throw new Error(`[${step}] HTTP ${response.status} ${pathname}\n${errorDetail}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('json')) {
    try {
      const parsed = JSON.parse(body)
      console.log(`  body: ${JSON.stringify(parsed).slice(0, 300)}`)
      // The device list falls outside that 300-char slice, and it is the only thing here that shows what
      // EARLIER runs left on the shared test cards — nothing deregisters them afterwards.
      if (Array.isArray(parsed.devices)) {
        const names = parsed.devices.map((device) => device?.applicationName ?? '(unnamed)').join(', ')
        console.log(`  devices (${parsed.devices.length}): ${names}`)
      }
    } catch {
      console.log(`  body: ${body.slice(0, 300)}`)
    }
  }

  return body
}

/**
 * Extracts a human-readable error message from an HTML error page.
 * Falls back to a raw text snippet if no structured error is found.
 *
 * @param {string} html
 * @returns {string}
 */
function extractErrorMessage(html) {
  try {
    const $ = load(html)
    const title = $('title').first().text().trim()
    const errorText = $('.login-error-message p, #error_div p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .join(' | ')

    if (errorText) {
      return title ? `${title}: ${errorText}` : errorText
    }
    if (title) {
      return title
    }
  } catch {
    // cheerio parse failed, fall through
  }

  return html.slice(0, 400)
}

/**
 * @param {string} html
 */
function extractPageDataAttributes(html) {
  const $ = load(html)
  const pageDataElement = $('#pageData').first()

  if (pageDataElement.length === 0) {
    return null
  }

  return Object.fromEntries(
    Object.entries(pageDataElement.attr())
      .filter(([attributeName]) => attributeName.startsWith('data-'))
      .map(([attributeName, value]) => [attributeName.slice(5), value])
  )
}

/** @param {string} html */
function extractPageTitle(html) {
  return load(html)('h1#page-title').first().text().trim()
}

/**
 * Throws unless the page's h1 title matches, so a 200 error page can never pass as success.
 *
 * @param {string} step
 * @param {string} html
 * @param {string} expectedTitle
 */
function assertPageTitle(step, html, expectedTitle) {
  const title = extractPageTitle(html)
  if (title !== expectedTitle) {
    throw new Error(`[${step}] expected page "${expectedTitle}" but got "${title || extractErrorMessage(html)}"`)
  }
}

/**
 * Abortable sleep so the caller's whole-chain budget can cut a claim-poll wait mid-interval.
 *
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('This operation was aborted'))
      return
    }
    const onAbort = () => {
      clearTimeout(timeoutId)
      reject(signal?.reason ?? new Error('This operation was aborted'))
    }
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * @typedef {{ typeId: string, number: string }} RegistrationDocument
 *
 * @typedef {Object} ApprovePhotoInput
 * @property {'photo'} flow
 * @property {string} cardSerialNumber
 * @property {string} cardBirthdate
 * @property {string} userCode
 *
 * @typedef {Object} ApproveNonPhotoInput
 * @property {'non-photo'} flow
 * @property {string} cardSerialNumber
 * @property {string} cardBirthdate
 * @property {string} userCode
 * @property {RegistrationDocument} document
 *
 * @typedef {Object} ApproveNonBcscInput
 * @property {'non-bcsc'} flow
 * @property {string} userCode
 * @property {RegistrationDocument[]} documents
 *
 * @typedef {ApprovePhotoInput | ApproveNonPhotoInput | ApproveNonBcscInput} ApproveInPersonInput
 */

/**
 * Builds the form body for the /usercode page submission.
 *
 * Photo flow uses a minimal body (no document or photo-ID fields).
 * Non-photo and non-bcsc flows use an extended body with up to two registration
 * documents and zeroed-out photo-ID verification toggles. Non-photo fills only
 * doc[0]; non-bcsc fills both. Order matches the captured HAR.
 *
 * @param {string} csrfToken
 * @param {ApproveInPersonInput} input
 * @returns {string}
 */
function buildUsercodeBody(csrfToken, input) {
  if (input.flow === 'photo') {
    return new URLSearchParams({
      csrftoken: csrfToken,
      autoPrint: 'true',
      printtype: 'receipt',
      suspiciousActivityVerificationValue: '0',
      command: 'Continue',
    }).toString()
  }

  const docs = input.flow === 'non-photo' ? [input.document] : input.documents
  const doc0 = docs[0] ?? { typeId: '', number: '' }
  const doc1 = docs[1] ?? { typeId: '', number: '' }

  return new URLSearchParams({
    csrftoken: csrfToken,
    autoPrint: 'true',
    printtype: 'receipt',
    photoIdVerificationValue: '',
    'registrationDocumentVerifications[0].documentTypeId': doc0.typeId,
    'registrationDocumentVerifications[1].documentTypeId': doc1.typeId,
    'registrationDocumentVerifications[0].documentNumber': doc0.number,
    'registrationDocumentVerifications[1].documentNumber': doc1.number,
    photoIdBirthdateVerificationValue: '0',
    photoIdNameVerificationValue: '0',
    photoIdValidityVerificationValue: '0',
    notes: '',
    suspiciousActivityVerificationValue: '0',
    command: 'Continue',
  }).toString()
}

/**
 * Shared SM preamble: seeds the cookie jar, authenticates with SiteMinder, and hands the SMSESSION
 * into IDCheck. Returns the cookie-bound fetch every later request must go through.
 *
 * @param {AbortSignal} [signal]
 */
async function establishIdcheckSession(signal) {
  previousStepAt = Date.now()

  const cookieJar = new CookieJar()
  const fetchWithCookies = makeFetchCookie(fetch, cookieJar)

  for (const cookie of initialCookieHeader.split(';')) {
    const trimmedCookie = cookie.trim()
    if (!trimmedCookie) {
      continue
    }

    await cookieJar.setCookie(trimmedCookie, 'https://logontest7.gov.bc.ca/')
  }

  const username = process.env.SM_USER
  const password = process.env.SM_PASSWORD

  if (!username || !password) {
    throw new Error('Missing SM_USER or SM_PASSWORD environment variables (set them in e2e/.env.e2e or export them in your shell)')
  }

  const smLoginBody = new URLSearchParams({
    SMENC: 'ISO-8859-1',
    SMLOCALE: 'US-EN',
    target: '/clp-cgi/int01/private/postLogon.cgi',
    smauthreason: '0',
    smagentname: '',
    user: username,
    password,
  }).toString()

  const smLoginResponse = await fetchWithCookies('https://logontest7.gov.bc.ca/clp-cgi/int01/logon.fcc', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'cache-control': 'max-age=0',
      'content-type': 'application/x-www-form-urlencoded',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'upgrade-insecure-requests': '1',
      Referer: 'https://logontest7.gov.bc.ca/clp-cgi/preLogon.cgi',
    },
    body: smLoginBody,
    method: 'POST',
    redirect: 'follow',
    signal,
  })
  await logStep('SM login', smLoginResponse)

  const idcheckResponse = await fetchWithCookies('https://idsit.gov.bc.ca/idcheck/?', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-site',
      'upgrade-insecure-requests': '1',
      Referer: 'https://logontest7.gov.bc.ca/',
    },
    body: null,
    method: 'GET',
    signal,
  })
  await logStep('idcheck redirect', idcheckResponse)

  return fetchWithCookies
}

/**
 * SM login flow to approve in-person verification. Selects one of three flows:
 *   - 'photo'     : BCSC card with photo (card serial + birthdate identifies user)
 *   - 'non-photo' : BCSC card without photo (adds an extra evidence + registration doc step)
 *   - 'non-bcsc'  : User has no BCSC card (identifies via usercode + two registration documents)
 *
 * @param {ApproveInPersonInput} input
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function approveInPersonLogin(input, options = {}) {
  const { signal } = options
  const fetchWithCookies = await establishIdcheckSession(signal)

  const identifyResponse = await fetchWithCookies(IDENTIFY_URL, {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'cache-control': 'max-age=0',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      Referer: VALIDATE_CARDHOLDER_URL,
    },
    body: null,
    method: 'GET',
    signal,
  })

  const identifyHtml = await logStep('identify in-person', identifyResponse)
  const pageDataAttributes = extractPageDataAttributes(identifyHtml)

  if (!pageDataAttributes?.['transaction-id'] || !pageDataAttributes?.['csrf-token']) {
    throw new Error('[identify in-person] Missing transaction-id or csrf-token in page data')
  }
  const transactionId = pageDataAttributes['transaction-id']
  const csrfToken = pageDataAttributes['csrf-token']
  console.log(`  transaction-id: ${transactionId}`)

  const createTxnResponse = await fetchWithCookies(
    `https://idsit.gov.bc.ca/cardtap/v3/transactions/${transactionId}?clientId=urn:ca:bc:gov:idcheck`,
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'content-type': 'application/json',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        Referer: IDENTIFY_URL,
      },
      body: null,
      method: 'POST',
      signal,
    }
  )
  await logStep('create transaction', createTxnResponse)

  const selectDeviceResponse = await fetchWithCookies(
    `https://idsit.gov.bc.ca/cardtap/v3/transactions/${transactionId}/device`,
    {
      headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'content-type': 'application/json',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        Referer: IDENTIFY_URL,
      },
      body: JSON.stringify({ deviceType: 'BCSC_CARD_LOOKUP' }),
      method: 'PUT',
      signal,
    }
  )
  await logStep('select device', selectDeviceResponse)

  let usercodePageReferer

  if (input.flow === 'photo' || input.flow === 'non-photo') {
    const cardsResponse = await fetchWithCookies(
      `https://idsit.gov.bc.ca/cardtap/v3/transactions/${transactionId}/cards`,
      {
        headers: {
          accept: '*/*',
          'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'x-requested-with': 'XMLHttpRequest',
          Referer: IDENTIFY_URL,
        },
        body: new URLSearchParams({
          card_serial_number: input.cardSerialNumber,
          birthdate: input.cardBirthdate,
        }).toString(),
        method: 'POST',
        signal,
      }
    )
    const validateCardTapResult = await logStep('submit card serial/birthdate', cardsResponse)

    const validateCardholderResponse = await fetchWithCookies(VALIDATE_CARDHOLDER_URL, {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'cache-control': 'max-age=0',
        'content-type': 'application/x-www-form-urlencoded',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        Referer: IDENTIFY_URL,
      },
      body: new URLSearchParams({
        csrftoken: csrfToken,
        validateCardTapResult,
      }).toString(),
      method: 'POST',
      signal,
    })
    await logStep('validate cardholder', validateCardholderResponse)

    if (input.flow === 'non-photo') {
      const evidenceResponse = await fetchWithCookies(
        'https://idsit.gov.bc.ca/idcheck/protected/isPrimaryEvidenceWithPhoto',
        {
          headers: {
            accept: '*/*',
            'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'x-requested-with': 'XMLHttpRequest',
            Referer: VALIDATE_CARDHOLDER_URL,
          },
          body: new URLSearchParams({
            evidenceTypeId: input.document.typeId,
            csrftoken: csrfToken,
          }).toString(),
          method: 'POST',
          signal,
        }
      )
      await logStep('isPrimaryEvidenceWithPhoto', evidenceResponse)
    }

    usercodePageReferer = VALIDATE_CARDHOLDER_URL
  } else if (input.flow === 'non-bcsc') {
    const verifyIdentityResponse = await fetchWithCookies(VERIFY_NON_BCSC_URL, {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'cache-control': 'max-age=0',
        'content-type': 'application/x-www-form-urlencoded',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        Referer: IDENTIFY_URL,
      },
      body: new URLSearchParams({
        csrftoken: csrfToken,
        usercode: input.userCode,
      }).toString(),
      method: 'POST',
      signal,
    })
    await logStep('non-bcsc verify identity', verifyIdentityResponse)

    usercodePageReferer = VERIFY_NON_BCSC_URL
  } else {
    throw new Error(`Unknown flow: ${/** @type {{flow: string}} */ (input).flow}`)
  }

  const usercodeResponse = await fetchWithCookies(
    'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/usercode',
    {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'cache-control': 'max-age=0',
        'content-type': 'application/x-www-form-urlencoded',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        Referer: usercodePageReferer,
      },
      body: buildUsercodeBody(csrfToken, input),
      method: 'POST',
      signal,
    }
  )
  await logStep('submit usercode page', usercodeResponse)

  const approveResponse = await fetchWithCookies('https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/approve', {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
      'cache-control': 'max-age=0',
      'content-type': 'application/x-www-form-urlencoded',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      Referer: 'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/usercode',
    },
    body: new URLSearchParams({
      csrftoken: csrfToken,
      usercode: input.userCode,
      command: 'continue',
    }).toString(),
    method: 'POST',
    signal,
  })
  await logStep('approve usercode', approveResponse)
}

/**
 * Browser-mimic header block for a same-origin document navigation GET.
 *
 * @param {string} referer
 */
function backcheckDocumentHeaders(referer) {
  return {
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
    'cache-control': 'max-age=0',
    'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    Referer: referer,
  }
}

/**
 * Same block for a document form POST — adds the content type and Origin seen in the capture.
 *
 * @param {string} referer
 */
function backcheckFormPostHeaders(referer) {
  return {
    ...backcheckDocumentHeaders(referer),
    'content-type': 'application/x-www-form-urlencoded',
    Origin: 'https://idsit.gov.bc.ca',
  }
}

/**
 * @typedef {'cardholder' | 'cardless'} ReviewQueue
 * @typedef {{ action: string, csrfToken: string, queue: ReviewQueue }} ClaimForm
 */

/** Which queue a claim/detail URL belongs to: `verifyIdentity` is cardholder, `reviewIdentity` cardless. */
function queueOfUrl(url) {
  return /reviewIdentity/.test(url) ? 'cardless' : 'cardholder'
}

/**
 * Every claim button on the dashboard. The portal renders a DIFFERENT form per queue — cardholder
 * requests post to `verifyIdentity`, cardless ones to `reviewIdentity` — and only for queues that
 * actually have work, so the endpoints are discovered rather than assumed.
 *
 * @param {string} dashboardHtml
 * @returns {ClaimForm[]}
 */
function findClaimForms(dashboardHtml) {
  const $ = load(dashboardHtml)
  /** @type {ClaimForm[]} */
  const forms = []
  $('form[id^="open-next-request"]').each((_, element) => {
    const form = $(element)
    const action = form.attr('action')
    const csrfToken = form.find('input[name="csrftoken"]').first().attr('value')
    if (!action || !csrfToken) {
      return
    }
    const href = new URL(action, IDCHECK_ORIGIN).href
    forms.push({ action: href, csrfToken, queue: queueOfUrl(href) })
  })
  return forms
}

/**
 * The claim button to press for `preferredQueue`, falling back to whichever queue has work (its head
 * then reads as foreign and is released) — so a review never stalls on a claim it could have made.
 *
 * @param {string} dashboardHtml
 * @param {ReviewQueue} preferredQueue
 * @returns {ClaimForm | null}
 */
function findClaimForm(dashboardHtml, preferredQueue) {
  const forms = findClaimForms(dashboardHtml)
  return forms.find((form) => form.queue === preferredQueue) ?? forms[0] ?? null
}

/**
 * Builds the attestation body by ECHOING the rendered review form: every answer is the affirmative
 * one, every other field is sent back as the portal filled it in.
 *
 * Which fields exist depends on what the person submitted — a cardholder with a photo card answers
 * three questions, while an added photo ID or a cardless registration brings its own document and
 * name fields, pre-filled with what the app sent. Echoing means those values come from the page
 * instead of from test config, which is what keeps one code path correct for every card type.
 *
 * @param {ReturnType<typeof load>} $ - the loaded review page
 * @param {'0' | '2'} suspiciousActivityValue - '0' confident (approve), '2' not confident (reject)
 * @param {'Continue' | 'CloseRequest'} command
 * @returns {string}
 */
function buildAttestationBody($, suspiciousActivityValue, command) {
  const form = $('#verify-form')
  if (form.length === 0) {
    throw new Error('[review form] no #verify-form on the review page')
  }

  const body = new URLSearchParams()
  const answeredGroups = new Set()

  form.find('input, select, textarea').each((_, element) => {
    const field = $(element)
    const name = field.attr('name')
    if (!name || field.attr('disabled') !== undefined) {
      return
    }
    // The page's own script disables (and clears) this entry unless the agent reports a birthdate
    // mismatch, so a faithful submission omits it.
    if (field.closest('#photo-id-birthdate-entry').length > 0) {
      return
    }

    const tag = element.tagName.toLowerCase()
    const type = (field.attr('type') ?? tag).toLowerCase()

    if (type === 'radio') {
      if (answeredGroups.has(name)) {
        return
      }
      answeredGroups.add(name)
      body.append(name, name === SUSPICIOUS_ACTIVITY_FIELD ? suspiciousActivityValue : AFFIRMATIVE_ANSWER)
      return
    }
    if (type === 'checkbox') {
      return // nothing on this form's checkboxes is part of the attestation
    }
    if (tag === 'select') {
      const selected = field.find('option[selected]')
      const option = selected.length > 0 ? selected : field.find('option').first()
      body.append(name, option.attr('value') ?? '')
      return
    }
    body.append(name, field.attr('value') ?? '')
  })

  body.append('command', command)
  return body.toString()
}

/**
 * Resolves the identity-match step a CARDLESS registration inserts before the decision: the reviewer
 * is shown candidate identity records and has to say which one this person is.
 *
 * The candidates' names are not in the page — it renders them client-side from a per-candidate JSON
 * endpoint — so this reads that same endpoint and picks by name rather than taking whatever is first.
 * Any run that cannot find the expected person stops instead of guessing at someone's identity.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {string} matchesHtml
 * @param {string} matchesUrl
 * @param {{ surname: string, firstName: string }} expected
 * @param {string} notes - Free text the portal REQUIRES here; an empty value is rejected
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>} the page reached after submitting the match
 */
async function resolveIdentityMatch(fetchWithCookies, matchesHtml, matchesUrl, expected, notes, signal) {
  const $ = load(matchesHtml)
  const form = $('#identity-match-form')
  const matchTransactionId = form.find('input[name="matchTransactionId"]').first().attr('value')
  const candidateIds = form
    .find('input[name="matchOptionIds"]')
    .map((_, element) => $(element).attr('value'))
    .get()

  if (!matchTransactionId || candidateIds.length === 0) {
    throw new Error('[identity match] no match transaction or candidates on the match page')
  }

  const wantedSurname = expected.surname.toUpperCase()
  const wantedFirstName = expected.firstName.toUpperCase()
  let chosenId = null
  const inspected = []

  for (const [index, candidateId] of candidateIds.entries()) {
    const candidateResponse = await fetchWithCookies(`${IDMATCH_RESULT_URL}/${matchTransactionId}/${index}`, {
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en-US,en;q=0.9,en-CA;q=0.8,pt;q=0.7',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Microsoft Edge";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        Referer: matchesUrl,
      },
      method: 'GET',
      signal,
    })
    if (!candidateResponse.ok) {
      continue // a candidate we cannot read is one we will not pick
    }

    const candidate = JSON.parse(await candidateResponse.text())
    inspected.push(candidate.displayName ?? '(unnamed)')
    if (
      (candidate.lastName ?? '').toUpperCase() === wantedSurname &&
      (candidate.firstName ?? '').toUpperCase() === wantedFirstName
    ) {
      chosenId = candidateId
      console.log(`  identity match: candidate ${index} (${candidate.displayName}) of ${candidateIds.length}`)
      break
    }
  }

  if (!chosenId) {
    throw new Error(
      `[identity match] none of the ${candidateIds.length} candidates is "${expected.surname}, ${expected.firstName}". Offered: ${JSON.stringify(inspected)}`
    )
  }

  const matchResponse = await fetchWithCookies(BACKCHECK_MATCHES_URL, {
    headers: backcheckFormPostHeaders(matchesUrl),
    body: new URLSearchParams({
      csrftoken: form.find('input[name="csrftoken"]').first().attr('value') ?? '',
      matchTransactionId,
      remoteTxSessionName: form.find('input[name="remoteTxSessionName"]').first().attr('value') ?? '',
      identifier: form.find('input[name="identifier"]').first().attr('value') ?? '',
      matchOptionIds: chosenId,
      // Required here, and silently so: submitting an empty note re-renders the same page.
      notes,
      notesRequired: 'true',
      command: 'Continue',
    }).toString(),
    method: 'POST',
    signal,
  })
  const matchHtml = await logStep('submit identity match', matchResponse)
  if (extractPageTitle(matchHtml) === IDENTITY_MATCH_TITLE) {
    throw new Error(`[identity match] the match was not accepted — still on "${IDENTITY_MATCH_TITLE}"`)
  }
  return matchHtml
}

/**
 * @typedef {Object} SendVideoApproveInput
 * @property {'approve'} decision
 * @property {string} cardSerialNumber - Expected serial; guards the blind FIFO claim ('N/A' when cardless)
 * @property {string} surname - Expected surname; the real guard for a cardless request
 * @property {string} firstName - Expected first name; also picks the identity match when one is asked for
 * @property {'ios' | 'android'} [platform] - The submitting device's platform; a same-persona request from the other one is foreign
 *
 * @typedef {Object} SendVideoRejectInput
 * @property {'reject'} decision
 * @property {string} cardSerialNumber
 * @property {string} surname
 * @property {string} firstName
 * @property {'ios' | 'android'} [platform]
 * @property {string} verificationComment - Reason text the app shows the user on the cancelled-review screen
 * @property {string} [comment] - Internal portal note; defaults to verificationComment
 * @property {string} [typeReasonId] - Portal reject-reason id; defaults to DEFAULT_REJECT_REASON_ID
 *
 * @typedef {SendVideoApproveInput | SendVideoRejectInput} SendVideoReviewInput
 */

/**
 * Guards JS/CLI callers the TS types cannot protect against.
 * @param {SendVideoReviewInput} input
 */
function assertValidSendVideoReviewInput(input) {
  if (input.decision !== 'approve' && input.decision !== 'reject') {
    throw new Error(`Unknown decision: ${/** @type {{decision: string}} */ (input).decision}`)
  }
  if (input.decision === 'reject' && !input.verificationComment) {
    throw new Error('reject requires verificationComment (the reason text shown to the user in the app)')
  }
  if (!input.surname || !input.firstName) {
    throw new Error('surname and firstName are required — they guard the claim and pick the identity match')
  }
}

/**
 * One claimed request's identity, parsed off its detail page.
 *
 * @typedef {Object} ClaimedRequest
 * @property {string} requestIdentifier
 * @property {string | undefined} csrfToken
 * @property {ReturnType<typeof load>} $detail
 * @property {string} claimedSerial
 * @property {string} claimedName
 * @property {string} claimedSurname
 * @property {string} claimedFirstName
 * @property {string} claimedOs - "iOS 18.6" / "Android 15" as the portal renders it ('' when absent)
 * @property {'ios' | 'android' | 'unknown'} claimedPlatform
 * @property {string} claimedAppVersion
 * @property {string} videoDate
 * @property {ReviewQueue} queue
 */

/** @param {string} os */
function platformOfOs(os) {
  if (/^(ios|iphone|ipad)\b/i.test(os)) return 'ios'
  if (/^android\b/i.test(os)) return 'android'
  return 'unknown'
}

/** Text of one detail-page field, whitespace-collapsed (the portal pads them with newlines and tabs). */
function detailText($detail, selector) {
  return $detail(selector).first().text().replaceAll(/\s+/g, ' ').trim()
}

/**
 * @param {string} detailHtml
 * @param {string} detailUrl
 * @returns {ClaimedRequest}
 */
function parseClaimedRequest(detailHtml, detailUrl) {
  const detailAttributes = extractPageDataAttributes(detailHtml)
  const requestIdentifier = detailAttributes?.['request-identifier']
  if (!requestIdentifier) {
    throw new Error('[claim send-video request] Missing request-identifier in page data')
  }
  const $detail = load(detailHtml)
  const claimedNames = $detail('#name-on-card span')
    .map((_, element) => $detail(element).text().trim())
    .get()
    .filter(Boolean)
  const claimedOs = detailText($detail, '#device-os')
  return {
    requestIdentifier,
    csrfToken: detailAttributes['csrf-token'],
    $detail,
    claimedSerial: $detail('#card-serial-number').first().text().trim(),
    claimedName: claimedNames.join(', '),
    claimedSurname: claimedNames[0] ?? '',
    claimedFirstName: claimedNames[1] ?? '',
    claimedOs,
    claimedPlatform: platformOfOs(claimedOs),
    claimedAppVersion: detailText($detail, '#device-app-version'),
    videoDate: detailText($detail, '#video-date').replace(/^video date:?\s*/i, ''),
    queue: queueOfUrl(detailUrl),
  }
}

/**
 * Serial alone cannot identify a cardless request (they all read "N/A"), so the surname AND first
 * name are what actually distinguish those — all three are checked, since a shared surname alone
 * could otherwise match the wrong queued request. The personas are shared across platforms, so when
 * the caller names its platform, the other platform's submission of the same person is foreign too.
 *
 * @param {ClaimedRequest} claimed
 * @param {{ cardSerialNumber: string, surname: string, firstName: string, platform?: 'ios' | 'android' }} input
 */
function matchesExpectedIdentity(claimed, input) {
  return (
    claimed.claimedSerial.toUpperCase() === input.cardSerialNumber.toUpperCase() &&
    claimed.claimedSurname.toUpperCase() === input.surname.toUpperCase() &&
    claimed.claimedFirstName.toUpperCase() === input.firstName.toUpperCase() &&
    matchesExpectedPlatform(claimed, input)
  )
}

/** Only blocks when the caller named a platform AND the page clearly names the other one. */
function matchesExpectedPlatform(claimed, input) {
  if (!input.platform || claimed.claimedPlatform === 'unknown') return true
  return claimed.claimedPlatform === input.platform
}

/** One line naming a claimed request, for logs and summaries. */
function describeClaimed(claimed) {
  return `${claimed.queue} ${claimed.requestIdentifier}: ${claimed.claimedName} — serial ${claimed.claimedSerial}, ${claimed.claimedOs || 'os unknown'}, app ${claimed.claimedAppVersion || '?'}, video ${claimed.videoDate || '?'}`
}

/** Reads the dashboard — the only page that says which queues hold work. */
async function fetchBackcheckDashboard(fetchWithCookies, signal) {
  const response = await fetchWithCookies(BACKCHECK_DASHBOARD_URL, {
    headers: backcheckDocumentHeaders(`${IDCHECK_ORIGIN}/idcheck/?`),
    body: null,
    method: 'GET',
    signal,
  })
  return logStep('backcheck dashboard', response)
}

/**
 * Presses a claim button and reports what it took. The queue can empty between the dashboard read and
 * the claim, and the portal then lands the POST on a list page instead of a request — which is why
 * `claimed` is optional. A non-OK response throws through logStep: a real error is never blind-retried.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {ClaimForm} claimForm
 * @param {string} step - log label, and the prefix on the error a non-OK response throws
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ claimed?: ClaimedRequest, response: Response, html: string }>}
 */
async function claimQueueHead(fetchWithCookies, claimForm, step, signal) {
  const response = await fetchWithCookies(claimForm.action, {
    headers: backcheckFormPostHeaders(BACKCHECK_DASHBOARD_URL),
    body: new URLSearchParams({ csrftoken: claimForm.csrfToken }).toString(),
    method: 'POST',
    signal,
  })
  const html = await response.text()
  if (!response.ok) {
    await logStep(step, response, html) // throws with the portal's message
  }
  // fetch-cookie follows the 302; landing on a per-request page means something was claimed.
  const claimed = CLAIMED_REQUEST_URL_PATTERN.test(response.url) ? parseClaimedRequest(html, response.url) : undefined
  return { claimed, response, html }
}

/** Where a claim that took nothing landed instead — the portal's way of saying the queue is empty. */
function describeClaimLanding(response, html) {
  return `${new URL(response.url).pathname} ("${extractPageTitle(html) || '(untitled)'}")`
}

/**
 * Polls the backcheck dashboard, claiming until the claimed request matches the expected person.
 *
 * The claim button takes the next submission blindly (FIFO, no worklist), and the queue is shared —
 * the other platform's run, a crashed run's leftovers, other SIT users — so the head can be anyone's.
 * Never review someone else's submission: a foreign claim is closed (`CloseRequest`, observed to
 * clear it from the queue) and the poll continues. The same request coming back a third time means
 * the release is not sticking, and the loop fails rather than churn the queue.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {SendVideoReviewInput} input
 * @param {number} claimTimeoutMs
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ detailUrl: string, claimed: ClaimedRequest }>}
 */
async function claimMatchingSendVideoRequest(fetchWithCookies, input, claimTimeoutMs, signal) {
  const claimDeadline = Date.now() + claimTimeoutMs
  /** @type {Map<string, number>} how often each foreign request id has been claimed (and closed) */
  const foreignClaims = new Map()

  for (let attempt = 1; ; attempt++) {
    const dashboardHtml = await fetchBackcheckDashboard(fetchWithCookies, signal)

    // Rendered only for a queue with work, so its absence is the empty-queue signal — and which one
    // it is decides the endpoint. A fresh-login role interstitial also lands here, hence the title.
    const claimForm = findClaimForm(dashboardHtml, input.cardSerialNumber.toUpperCase() === 'N/A' ? 'cardless' : 'cardholder')
    if (!claimForm) {
      console.log(
        `[sm-login] [~] claim attempt ${attempt}: no claim button on the dashboard — page is "${extractPageTitle(dashboardHtml) || '(untitled)'}"`
      )
      await waitForNextClaimAttemptOrThrow(claimDeadline, claimTimeoutMs, signal)
      continue
    }

    const {
      claimed,
      response: claimResponse,
      html: claimHtml,
    } = await claimQueueHead(fetchWithCookies, claimForm, 'claim send-video request', signal)
    if (!claimed) {
      const landing = describeClaimLanding(claimResponse, claimHtml)
      console.log(`[sm-login] [~] claim attempt ${attempt}: nothing queued yet (landed on ${landing})`)
      await waitForNextClaimAttemptOrThrow(claimDeadline, claimTimeoutMs, signal, () => landing)
      continue
    }

    if (matchesExpectedIdentity(claimed, input)) {
      await logStep('claim send-video request', claimResponse, claimHtml)
      console.log(`  claimed ${describeClaimed(claimed)}`)
      return { detailUrl: claimResponse.url, claimed }
    }

    const timesClaimed = (foreignClaims.get(claimed.requestIdentifier) ?? 0) + 1
    foreignClaims.set(claimed.requestIdentifier, timesClaimed)
    if (timesClaimed >= 3) {
      // One last release before failing: the previous ones evidently did not stick, but bailing
      // while still holding the claim would leave the queue head ours and block the next run too.
      await releaseClaimedRequest(fetchWithCookies, claimed.$detail, claimResponse.url, signal)
      throw new Error(
        `[claim send-video request] CloseRequest is not clearing ${claimed.requestIdentifier} ` +
          `("${claimed.claimedName}", serial ${claimed.claimedSerial}) — claimed it ${timesClaimed} times while ` +
          `waiting for "${input.surname}, ${input.firstName}" (serial ${input.cardSerialNumber}); ` +
          `check the SIT backcheck dashboard`
      )
    }

    console.log(
      `[sm-login] [~] claim attempt ${attempt}: claimed foreign request ${claimed.requestIdentifier} ` +
        `("${claimed.claimedName}", serial ${claimed.claimedSerial}, ${claimed.claimedOs || 'os unknown'}) — closing it and retrying`
    )
    await releaseClaimedRequest(fetchWithCookies, claimed.$detail, claimResponse.url, signal)
    await waitForNextClaimAttemptOrThrow(
      claimDeadline,
      claimTimeoutMs,
      signal,
      () => `closed foreign request ${claimed.requestIdentifier} ("${claimed.claimedName}")`
    )
  }
}

/**
 * Sleeps until the next claim poll, or throws if the deadline would be exceeded first.
 *
 * @param {number} claimDeadline
 * @param {number} claimTimeoutMs
 * @param {AbortSignal} [signal]
 * @param {() => string} [describeLastPage]
 */
async function waitForNextClaimAttemptOrThrow(claimDeadline, claimTimeoutMs, signal, describeLastPage) {
  if (Date.now() + CLAIM_POLL_INTERVAL_MS < claimDeadline) {
    await sleep(CLAIM_POLL_INTERVAL_MS, signal)
    return
  }
  const suffix = describeLastPage ? ` — last: ${describeLastPage()}` : ''
  throw new Error(`[claim send-video request] no matching submission within ${claimTimeoutMs}ms${suffix}`)
}

/**
 * Best-effort `CloseRequest` release of a claimed request. Never throws — the claim loop decides
 * what a release that did not stick means — but a non-OK response is worth a warning, since a
 * silently failed release is exactly how the same foreign request comes straight back.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {ReturnType<typeof load>} $detail
 * @param {string} detailUrl
 * @param {AbortSignal} [signal]
 */
async function releaseClaimedRequest(fetchWithCookies, $detail, detailUrl, signal) {
  try {
    const response = await fetchWithCookies(BACKCHECK_CONTINUE_URL, {
      headers: backcheckFormPostHeaders(detailUrl),
      body: buildAttestationBody($detail, AFFIRMATIVE_ANSWER, 'CloseRequest'),
      method: 'POST',
      signal,
    })
    if (!response.ok) {
      console.warn(`[sm-login] [!] CloseRequest release returned ${response.status}`)
    }
  } catch (err) {
    console.warn('[sm-login] [!] CloseRequest release failed:', err)
  }
}

/**
 * Submits the attestation, resolves an identity-match step if the portal asks for one (cardless
 * registrations only), and posts the final approve/reject decision.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {ReturnType<typeof load>} $detail
 * @param {string} detailUrl
 * @param {string} requestIdentifier
 * @param {string} csrfToken
 * @param {SendVideoReviewInput} input
 * @param {AbortSignal} [signal]
 */
async function submitSendVideoDecision(fetchWithCookies, $detail, detailUrl, requestIdentifier, csrfToken, input, signal) {
  const decisionTitle = input.decision === 'approve' ? REVIEW_READY_TITLE : REJECT_NOTE_TITLE
  const suspiciousActivityValue = input.decision === 'approve' ? AFFIRMATIVE_ANSWER : '2'
  const continueResponse = await fetchWithCookies(BACKCHECK_CONTINUE_URL, {
    headers: backcheckFormPostHeaders(detailUrl),
    body: buildAttestationBody($detail, suspiciousActivityValue, 'Continue'),
    method: 'POST',
    signal,
  })
  let continueHtml = await logStep('submit attestation', continueResponse)

  // A cardless registration is asked which existing identity this person is before any decision.
  if (extractPageTitle(continueHtml) === IDENTITY_MATCH_TITLE) {
    continueHtml = await resolveIdentityMatch(
      fetchWithCookies,
      continueHtml,
      continueResponse.url,
      { surname: input.surname, firstName: input.firstName },
      input.decision === 'reject' ? input.verificationComment : 'e2e automated identity match',
      signal
    )
  }
  assertPageTitle('submit attestation', continueHtml, decisionTitle)

  if (input.decision === 'approve') {
    const approveResponse = await fetchWithCookies(BACKCHECK_APPROVE_URL, {
      headers: backcheckFormPostHeaders(BACKCHECK_CONTINUE_URL),
      body: new URLSearchParams({ remoteTxSessionName: requestIdentifier, csrftoken: csrfToken }).toString(),
      method: 'POST',
      signal,
    })
    const approveHtml = await logStep('approve send-video request', approveResponse)
    assertPageTitle('approve send-video request', approveHtml, APPROVE_DONE_TITLE)
    return
  }

  const noteResponse = await fetchWithCookies(BACKCHECK_NOTE_URL, {
    headers: backcheckFormPostHeaders(BACKCHECK_CONTINUE_URL),
    body: new URLSearchParams({
      csrftoken: csrfToken,
      identifier: requestIdentifier,
      remoteTxSessionName: requestIdentifier,
      typeReasonId: input.typeReasonId ?? DEFAULT_REJECT_REASON_ID,
      comment: input.comment ?? input.verificationComment,
      verificationComment: input.verificationComment,
    }).toString(),
    method: 'POST',
    signal,
  })
  const noteHtml = await logStep('reject send-video request', noteResponse)
  assertPageTitle('reject send-video request', noteHtml, NOTE_DONE_TITLE)
}

/**
 * SM login flow to review (approve or reject) a queued send-video verification request.
 *
 * The portal has no queue listing — its claim button takes the next submission FIFO — so the claim is
 * polled until it lands on the expected person, closing foreign submissions along the way (see
 * {@link claimMatchingSendVideoRequest}). Which claim button exists depends on the queue holding the
 * work, and what the review asks for depends on what the person submitted, so both are read off the
 * pages themselves: cardholder requests go straight to the decision, while a cardless registration
 * inserts an identity-match step first.
 *
 * @param {SendVideoReviewInput} input
 * @param {{ signal?: AbortSignal, claimTimeoutMs?: number }} [options]
 * @returns {Promise<ClaimedRequestSummary>}
 */
export async function reviewSendVideoLogin(input, options = {}) {
  const { signal, claimTimeoutMs = DEFAULT_CLAIM_TIMEOUT_MS } = options

  assertValidSendVideoReviewInput(input)

  const fetchWithCookies = await establishIdcheckSession(signal)
  const { detailUrl, claimed } = await claimMatchingSendVideoRequest(fetchWithCookies, input, claimTimeoutMs, signal)
  const { requestIdentifier, csrfToken, $detail } = claimed

  await submitSendVideoDecision(fetchWithCookies, $detail, detailUrl, requestIdentifier, csrfToken, input, signal)

  return summarizeClaimed(claimed)
}

/**
 * @typedef {Object} ClaimedRequestSummary
 * @property {string} requestIdentifier
 * @property {ReviewQueue} queue
 * @property {string} claimedName
 * @property {string} claimedSerial
 * @property {string} claimedOs
 * @property {string} claimedAppVersion
 * @property {string} videoDate
 *
 * @typedef {Object} DrainSendVideoQueueResult
 * @property {ClaimedRequestSummary[]} rejected
 * @property {ClaimedRequestSummary[]} released
 * @property {ReviewQueue[]} queuesWithWork - Queues still showing a claim button when the drain ended
 * @property {string} [stoppedReason] - Why the drain stopped before the dashboard ran dry
 */

/** @param {ClaimedRequest} claimed @returns {ClaimedRequestSummary} */
function summarizeClaimed(claimed) {
  const { requestIdentifier, queue, claimedName, claimedSerial, claimedOs, claimedAppVersion, videoDate } = claimed
  return { requestIdentifier, queue, claimedName, claimedSerial, claimedOs, claimedAppVersion, videoDate }
}

/** The reason the portal records for a request the drain rejects — it lands in the card's activity log. */
const DEFAULT_DRAIN_REASON = 'Automated e2e queue cleanup'
/** Upper bound on claims per drain: a queue that deep is a person's problem, not a loop's. */
const DEFAULT_DRAIN_MAX_CLAIMS = 25

/**
 * Guards JS/CLI callers the TS types cannot protect against.
 * @param {string} scope
 * @param {unknown[]} personas
 */
function assertValidDrainScope(scope, personas) {
  if (scope !== 'all' && scope !== 'e2e') {
    throw new Error(`[queue drain] unknown scope "${scope}" (all | e2e)`)
  }
  if (scope === 'e2e' && personas.length === 0) {
    throw new Error("[queue drain] scope 'e2e' needs the personas to keep to")
  }
}

/**
 * Empty the review queues: claim the head, reject it, repeat until the dashboard renders no claim
 * button. The journeys run it before they submit (so their own upload is the head the review claims)
 * and after a failure (so an orphan never waits for the morning); CI runs it after every lane.
 *
 * `scope: 'e2e'` rejects only the listed personas and STOPS at the first foreign head, releasing it
 * the way a review does — FIFO means nothing behind it is reachable without touching it. Rejecting,
 * not closing: a rejection is a terminal, logged decision, while `CloseRequest` has only ever been
 * observed to release the claim.
 *
 * `dryRun` only logs in and reads the dashboard — which queues hold work — claiming nothing.
 *
 * @param {{ scope?: 'all' | 'e2e', personas?: { cardSerialNumber: string, surname: string, firstName: string }[], reason?: string, maxClaims?: number, dryRun?: boolean, signal?: AbortSignal }} [options]
 * @returns {Promise<DrainSendVideoQueueResult>}
 */
export async function drainSendVideoQueue(options = {}) {
  const {
    scope = 'all',
    personas = [],
    reason = DEFAULT_DRAIN_REASON,
    maxClaims = DEFAULT_DRAIN_MAX_CLAIMS,
    dryRun = false,
    signal,
  } = options
  assertValidDrainScope(scope, personas)

  const fetchWithCookies = await establishIdcheckSession(signal)
  /** @type {DrainSendVideoQueueResult} */
  const result = { rejected: [], released: [], queuesWithWork: [] }
  /** @type {Map<string, 'rejected' | 'released'>} what this run already did to each request id */
  const handled = new Map()

  for (let claims = 0; ; claims++) {
    const dashboardHtml = await fetchBackcheckDashboard(fetchWithCookies, signal)
    const claimForms = findClaimForms(dashboardHtml)
    result.queuesWithWork = claimForms.map((form) => form.queue)
    const claimForm = claimForms[0]
    if (!claimForm) {
      console.log(`[queue drain] queues empty after ${claims} claim(s)`)
      return result
    }
    if (dryRun) {
      result.stoppedReason = `dry run — work queued in: ${result.queuesWithWork.join(', ')} (nothing claimed)`
      return result
    }
    if (claims >= maxClaims) {
      result.stoppedReason = `stopped after ${maxClaims} claims with the ${claimForm.queue} queue still holding work`
      return result
    }

    const {
      claimed,
      response: claimResponse,
      html: claimHtml,
    } = await claimQueueHead(fetchWithCookies, claimForm, 'claim queued request', signal)
    if (!claimed) {
      result.stoppedReason = `the claim landed on ${describeClaimLanding(claimResponse, claimHtml)} instead of a request`
      return result
    }

    const summary = summarizeClaimed(claimed)
    const before = handled.get(claimed.requestIdentifier)
    if (before) {
      // A decision that did not stick, or a foreign head under 'e2e' — either way, stop churning.
      await releaseClaimedRequest(fetchWithCookies, claimed.$detail, claimResponse.url, signal)
      result.stoppedReason = `${claimed.requestIdentifier} ("${claimed.claimedName}") came back after being ${before}`
      return result
    }

    if (scope === 'e2e' && !personas.some((persona) => matchesExpectedIdentity(claimed, persona))) {
      await releaseClaimedRequest(fetchWithCookies, claimed.$detail, claimResponse.url, signal)
      handled.set(claimed.requestIdentifier, 'released')
      result.released.push(summary)
      result.stoppedReason = `foreign request at the head — released ${claimed.requestIdentifier} ("${claimed.claimedName}") and stopped (scope e2e)`
      console.log(`[queue drain] released ${describeClaimed(claimed)}`)
      return result
    }

    await submitSendVideoDecision(
      fetchWithCookies,
      claimed.$detail,
      claimResponse.url,
      claimed.requestIdentifier,
      claimed.csrfToken,
      {
        decision: 'reject',
        cardSerialNumber: claimed.claimedSerial,
        surname: claimed.claimedSurname,
        firstName: claimed.claimedFirstName,
        verificationComment: reason,
        comment: reason,
      },
      signal
    )
    handled.set(claimed.requestIdentifier, 'rejected')
    result.rejected.push(summary)
    console.log(`[queue drain] rejected ${describeClaimed(claimed)}`)
  }
}

function isRunAsCli() {
  const entry = process.argv[1]
  if (!entry) {
    return false
  }
  return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(entry)
}

/**
 * Parse a "<typeId>:<documentNumber>" CLI doc spec.
 * @param {string} spec
 * @returns {RegistrationDocument}
 */
function parseDocSpec(spec) {
  const colonIdx = spec.indexOf(':')
  const typeId = colonIdx === -1 ? '' : spec.slice(0, colonIdx)
  const number = colonIdx === -1 ? '' : spec.slice(colonIdx + 1)
  if (!typeId || !number) {
    throw new Error(`Invalid document spec: "${spec}" (expected "<typeId>:<number>")`)
  }
  return { typeId, number }
}

function printUsage() {
  console.error('Usage:')
  console.error('  node login.mjs photo     <serial> <birthdate(YYYY-MM-DD)> <code>')
  console.error('  node login.mjs non-photo <serial> <birthdate(YYYY-MM-DD)> <code> <docTypeId>:<docNum>')
  console.error('  node login.mjs non-bcsc  <code> <docTypeId>:<docNum> <docTypeId>:<docNum>')
  console.error('  node login.mjs send-video approve <serial> <surname> <firstName>')
  console.error('  node login.mjs send-video reject  <serial> <surname> <firstName> [reasonId] [message]')
  console.error('     (serial is "N/A" for a cardless registration; the name is what identifies it)')
  console.error('  Draining the review queue: yarn queue:drain [--scope all|e2e] (scripts/send-video-queue.ts)')
}

if (isRunAsCli()) {
  // CLI-only: load .env.e2e so the standalone invocation has SM_USER/
  // SM_PASSWORD. When this module is dynamic-imported by wdio tests,
  // configs/wdio.shared.conf.ts has already loaded .env.e2e and this
  // branch is skipped. In CI, the values come from workflow env (no
  // file load needed).
  dotenv.config({ path: path.join(SCRIPT_DIR, '..', '.env.e2e') })

  const [flow, ...rest] = process.argv.slice(2)

  /** @type {ApproveInPersonInput | null} */
  let input = null
  /** @type {SendVideoReviewInput | null} */
  let sendVideoInput = null

  try {
    if (flow === 'photo') {
      const [serial, birthdate, code] = rest
      if (!serial || !birthdate || !code) {
        throw new Error('photo flow requires <serial> <birthdate> <code>')
      }
      input = { flow: 'photo', cardSerialNumber: serial, cardBirthdate: birthdate, userCode: code }
    } else if (flow === 'non-photo') {
      const [serial, birthdate, code, docSpec] = rest
      if (!serial || !birthdate || !code || !docSpec) {
        throw new Error('non-photo flow requires <serial> <birthdate> <code> <docTypeId>:<docNum>')
      }
      input = {
        flow: 'non-photo',
        cardSerialNumber: serial,
        cardBirthdate: birthdate,
        userCode: code,
        document: parseDocSpec(docSpec),
      }
    } else if (flow === 'non-bcsc') {
      const [code, docSpec1, docSpec2] = rest
      if (!code || !docSpec1 || !docSpec2) {
        throw new Error('non-bcsc flow requires <code> <docTypeId>:<docNum> <docTypeId>:<docNum>')
      }
      input = {
        flow: 'non-bcsc',
        userCode: code,
        documents: [parseDocSpec(docSpec1), parseDocSpec(docSpec2)],
      }
    } else if (flow === 'send-video') {
      const [decision, serial, surname, firstName, reasonId, message] = rest
      if ((decision !== 'approve' && decision !== 'reject') || !serial || !surname || !firstName) {
        throw new Error('send-video requires approve|reject <serial> <surname> <firstName>')
      }
      sendVideoInput =
        decision === 'approve'
          ? { decision, cardSerialNumber: serial, surname, firstName }
          : {
              decision,
              cardSerialNumber: serial,
              surname,
              firstName,
              typeReasonId: reasonId ?? DEFAULT_REJECT_REASON_ID,
              verificationComment: message ?? 'e2e automated rejection',
            }
    } else {
      throw new Error(`Unknown or missing flow: "${flow ?? ''}"`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    printUsage()
    process.exit(1)
  }

  if (sendVideoInput) {
    const claimed = await reviewSendVideoLogin(sendVideoInput)
    console.log(`[sm-login] reviewed ${claimed.requestIdentifier}: ${claimed.claimedName} (serial ${claimed.claimedSerial})`)
  } else {
    await approveInPersonLogin(input)
  }
}

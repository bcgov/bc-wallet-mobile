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
const BACKCHECK_BASE_URL = 'https://idsit.gov.bc.ca/idcheck/protected/backCheckRequest'
const BACKCHECK_DASHBOARD_URL = `${BACKCHECK_BASE_URL}/dashboard`
const BACKCHECK_CLAIM_URL = `${BACKCHECK_BASE_URL}/verifyIdentity`
const BACKCHECK_CONTINUE_URL = `${BACKCHECK_BASE_URL}/continue`
const BACKCHECK_APPROVE_URL = `${BACKCHECK_BASE_URL}/approve`
const BACKCHECK_NOTE_URL = `${BACKCHECK_BASE_URL}/note`

// 22 = "additional person in photo or video", the reason used in the reference capture.
const DEFAULT_REJECT_REASON_ID = '22'
const CLAIM_POLL_INTERVAL_MS = 5_000
const DEFAULT_CLAIM_TIMEOUT_MS = 120_000

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

/**
 * First value of the named form input. Duplicated from src/helpers/pairing-code.ts — this file is
 * plain node ESM and cannot import the TS helper.
 *
 * @param {ReturnType<typeof load>} $
 * @param {string} name
 */
function inputValue($, name) {
  return $(`input[name="${name}"]`).first().attr('value') ?? null
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
 * Builds the attestation form body; field order mirrors the captured browser submission.
 * All attestation answers are the "all good" values — the fork is suspiciousActivityVerificationValue
 * ('0' confident = approve path, '2' not confident = reject path).
 *
 * @param {string} csrfToken
 * @param {string} requestIdentifier
 * @param {'0' | '2'} suspiciousActivityValue
 * @param {'Continue' | 'CloseRequest'} command
 * @returns {string}
 */
function buildBackcheckContinueBody(csrfToken, requestIdentifier, suspiciousActivityValue, command) {
  return new URLSearchParams({
    remoteTxSessionName: requestIdentifier,
    requestIdentifier,
    videoVerificationValue: '0',
    nameVerificationValue: '0',
    photoVerificationValue: '0',
    csrftoken: csrfToken,
    suspiciousActivityVerificationValue: suspiciousActivityValue,
    command,
  }).toString()
}

/**
 * @typedef {Object} SendVideoApproveInput
 * @property {'approve'} decision
 * @property {string} cardSerialNumber - Expected serial; guards the blind FIFO claim
 *
 * @typedef {Object} SendVideoRejectInput
 * @property {'reject'} decision
 * @property {string} cardSerialNumber
 * @property {string} verificationComment - Reason text the app shows the user on the cancelled-review screen
 * @property {string} [comment] - Internal portal note; defaults to verificationComment
 * @property {string} [typeReasonId] - Portal reject-reason id; defaults to DEFAULT_REJECT_REASON_ID
 *
 * @typedef {SendVideoApproveInput | SendVideoRejectInput} SendVideoReviewInput
 */

/**
 * SM login flow to review (approve or reject) a queued send-video verification request.
 *
 * The portal has no queue listing — the dashboard's "Open Next Request" claims the next submission
 * FIFO, so the claim is polled until one appears and the claimed item's card serial is checked
 * against the expected one before any decision is posted.
 *
 * @param {SendVideoReviewInput} input
 * @param {{ signal?: AbortSignal, claimTimeoutMs?: number }} [options]
 * @returns {Promise<{ requestIdentifier: string, claimedSerial: string, claimedName: string }>}
 */
export async function reviewSendVideoLogin(input, options = {}) {
  const { signal, claimTimeoutMs = DEFAULT_CLAIM_TIMEOUT_MS } = options

  if (input.decision !== 'approve' && input.decision !== 'reject') {
    throw new Error(`Unknown decision: ${/** @type {{decision: string}} */ (input).decision}`)
  }
  // Guards JS/CLI callers the TS types cannot protect.
  if (input.decision === 'reject' && !input.verificationComment) {
    throw new Error('reject requires verificationComment (the reason text shown to the user in the app)')
  }

  const fetchWithCookies = await establishIdcheckSession(signal)

  // Claim loop: re-scrape the dashboard each attempt, exactly like a human reloading and clicking
  // "Open Next Request" until the submission lands in the queue.
  const claimDeadline = Date.now() + claimTimeoutMs
  let csrfToken
  let detailUrl
  let detailHtml

  for (let attempt = 1; ; attempt++) {
    const dashboardResponse = await fetchWithCookies(BACKCHECK_DASHBOARD_URL, {
      headers: backcheckDocumentHeaders('https://idsit.gov.bc.ca/idcheck/?'),
      body: null,
      method: 'GET',
      signal,
    })
    const dashboardHtml = await logStep('backcheck dashboard', dashboardResponse)

    // The dashboard #pageData carries no csrf attr — the token is the claim form's hidden input.
    csrfToken = inputValue(load(dashboardHtml), 'csrftoken')
    if (!csrfToken) {
      // A fresh-login role interstitial would land here — name the page so the failure self-diagnoses.
      throw new Error(
        `[backcheck dashboard] no csrftoken input found — page is "${extractPageTitle(dashboardHtml) || extractErrorMessage(dashboardHtml)}"`
      )
    }

    const claimResponse = await fetchWithCookies(BACKCHECK_CLAIM_URL, {
      headers: backcheckFormPostHeaders(BACKCHECK_DASHBOARD_URL),
      body: new URLSearchParams({ csrftoken: csrfToken }).toString(),
      method: 'POST',
      signal,
    })
    const claimHtml = await claimResponse.text()
    // fetch-cookie follows the 302; landing on a detail page means a request was claimed.
    if (claimResponse.ok && /\/backCheckRequest\/verifyIdentity\/[^/?#]+$/.test(claimResponse.url)) {
      await logStep('claim send-video request', claimResponse, claimHtml)
      detailUrl = claimResponse.url
      detailHtml = claimHtml
      break
    }
    if (!claimResponse.ok) {
      // Reuses logStep's throw path — a real error is never blind-retried.
      await logStep('claim send-video request', claimResponse, claimHtml)
    }

    const landedPath = new URL(claimResponse.url).pathname
    console.log(`[sm-login] [~] claim attempt ${attempt}: nothing queued yet (landed on ${landedPath})`)
    if (Date.now() + CLAIM_POLL_INTERVAL_MS >= claimDeadline) {
      throw new Error(
        `[claim send-video request] no queued submission within ${claimTimeoutMs}ms — last page: "${extractPageTitle(claimHtml) || landedPath}"`
      )
    }
    await sleep(CLAIM_POLL_INTERVAL_MS, signal)
  }

  const detailAttributes = extractPageDataAttributes(detailHtml)
  const requestIdentifier = detailAttributes?.['request-identifier']
  if (!requestIdentifier) {
    throw new Error('[claim send-video request] Missing request-identifier in page data')
  }
  // The detail page repeats the session csrf token; prefer the freshest value.
  csrfToken = detailAttributes['csrf-token'] ?? csrfToken

  const $detail = load(detailHtml)
  const claimedSerial = $detail('#card-serial-number').first().text().trim()
  const claimedName = $detail('#name-on-card span')
    .map((_, element) => $detail(element).text().trim())
    .get()
    .filter(Boolean)
    .join(', ')
  console.log(`  claimed ${requestIdentifier}: ${claimedName} — serial ${claimedSerial}`)

  if (claimedSerial.toUpperCase() !== input.cardSerialNumber.toUpperCase()) {
    // Never review someone else's submission; try to release it, then fail loudly.
    try {
      await fetchWithCookies(BACKCHECK_CONTINUE_URL, {
        headers: backcheckFormPostHeaders(detailUrl),
        body: buildBackcheckContinueBody(csrfToken, requestIdentifier, '0', 'CloseRequest'),
        method: 'POST',
        signal,
      })
    } catch {
      // best-effort release only — the throw below carries the real failure
    }
    throw new Error(
      `[claim send-video request] claimed ${requestIdentifier} ("${claimedName}", serial ${claimedSerial}) but expected serial ${input.cardSerialNumber} — a CloseRequest release was attempted; check the SIT backcheck dashboard before re-running`
    )
  }

  const suspiciousActivityValue = input.decision === 'approve' ? '0' : '2'
  const continueResponse = await fetchWithCookies(BACKCHECK_CONTINUE_URL, {
    headers: backcheckFormPostHeaders(detailUrl),
    body: buildBackcheckContinueBody(csrfToken, requestIdentifier, suspiciousActivityValue, 'Continue'),
    method: 'POST',
    signal,
  })
  const continueHtml = await logStep('submit attestation', continueResponse)
  assertPageTitle(
    'submit attestation',
    continueHtml,
    input.decision === 'approve' ? 'Choose how to assist the individual' : 'Add Note to Activity Log'
  )

  if (input.decision === 'approve') {
    const approveResponse = await fetchWithCookies(BACKCHECK_APPROVE_URL, {
      headers: backcheckFormPostHeaders(BACKCHECK_CONTINUE_URL),
      body: new URLSearchParams({ remoteTxSessionName: requestIdentifier, csrftoken: csrfToken }).toString(),
      method: 'POST',
      signal,
    })
    const approveHtml = await logStep('approve send-video request', approveResponse)
    assertPageTitle('approve send-video request', approveHtml, 'Card Added to Mobile')
  } else {
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
    assertPageTitle('reject send-video request', noteHtml, 'Note Added to Activity Log')
  }

  return { requestIdentifier, claimedSerial, claimedName }
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
  console.error('  node login.mjs send-video approve <serial>')
  console.error('  node login.mjs send-video reject  <serial> [reasonId] [message]')
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
      const [decision, serial, reasonId, message] = rest
      if ((decision !== 'approve' && decision !== 'reject') || !serial) {
        throw new Error('send-video requires approve|reject <serial>')
      }
      sendVideoInput =
        decision === 'approve'
          ? { decision, cardSerialNumber: serial }
          : {
              decision,
              cardSerialNumber: serial,
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

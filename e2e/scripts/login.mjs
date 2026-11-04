import { load } from 'cheerio'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkIdcheckSignIn,
  establishIdcheckSession,
  IDCHECK_ORIGIN,
  invalidateIdcheckSession,
} from './idcheck-session.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

const IDENTIFY_URL =
  'https://idsit.gov.bc.ca/idcheck/protected/deviceCredential/identify?menuItemAction=verifyMobileCardInPerson'
const VALIDATE_CARDHOLDER_URL = 'https://idsit.gov.bc.ca/idcheck/protected/validatecardholder'
const VERIFY_NON_BCSC_URL = 'https://idsit.gov.bc.ca/idcheck/protected/counterNonBcscRequest/verifyIdentity'

// Send-video submissions are reviewed by a different controller family than in-person.
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
/** The transfer-to-specialist chain: the note the portal asks for, then its confirmation. */
const TRANSFER_NOTE_TITLE = 'Add Notes for Transfer'
const TRANSFER_DONE_TITLE = 'Request Transferred'

/**
 * Wall-clock at the previous {@link logStep}, so each line reports how long its request took. The whole
 * chain shares ONE abort budget, so a timeout names the request in flight — structurally the last one —
 * not the slow one; these timings tell them apart. Module state is safe: one wdio worker, one journey.
 */
let previousStepAt = 0

/**
 * Logs a compact summary line for a response and throws on non-2xx status, or on a response from
 * anywhere but IDCheck: a lost session bounces to the identity provider's sign-in page with a 200,
 * so that is named here (and the cached session dropped) instead of surfacing as a missing token.
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
  const landing = new URL(response.url)
  const pathname = landing.pathname
  const icon = response.ok ? '+' : '!'
  console.log(`[idcheck] [${icon}] ${step}: ${response.status} ${pathname} (${elapsedSeconds}s)`)

  if (!response.ok) {
    const errorDetail = extractErrorMessage(body)
    throw new Error(`[${step}] HTTP ${response.status} ${pathname}\n${errorDetail}`)
  }
  if (landing.origin !== IDCHECK_ORIGIN) {
    invalidateIdcheckSession()
    throw new Error(`[${step}] session lost — landed on ${landing.host}${pathname} (${extractErrorMessage(body)})`)
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
 * Shared preamble: the signed-in IDCheck session (idcheck-session.mjs) with the step clock reset, so
 * the per-step timings cover the chain and the sign-in reports its own.
 *
 * @param {AbortSignal} [signal]
 */
async function openSession(signal) {
  const fetchWithCookies = await establishIdcheckSession(signal)
  previousStepAt = Date.now()
  return fetchWithCookies
}

/**
 * Approves an in-person verification in the IDCheck portal. Selects one of three flows:
 *   - 'photo'     : BCSC card with photo (card serial + birthdate identifies user)
 *   - 'non-photo' : BCSC card without photo (adds an extra evidence + registration doc step)
 *   - 'non-bcsc'  : User has no BCSC card (identifies via usercode + two registration documents)
 *
 * @param {ApproveInPersonInput} input
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function approveInPersonLogin(input, options = {}) {
  const { signal } = options
  const fetchWithCookies = await openSession(signal)

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
 * The two send-video review queues, by the portal's names for them. `regular` is the dashboard's
 * "Other Verify Requests" FIFO, where a cardholder's upload lands; `specialist` is its "Specialist
 * Review" queue, where a cardless registration lands (its identity match is specialist work) — and
 * where an agent's "Transfer Request to Specialist" moves anything else.
 *
 * @typedef {'regular' | 'specialist'} ReviewQueue
 * @typedef {{ action: string, csrfToken: string, queue: ReviewQueue }} ClaimForm
 */

/** The order the queues are worked in: the regular FIFO first, the specialist queue after it. */
const REVIEW_QUEUE_ORDER = ['regular', 'specialist']

/** Which queue a claim/detail URL belongs to: `verifyIdentity` is the regular queue, `reviewIdentity` the specialist one. */
function queueOfUrl(url) {
  return /reviewIdentity/.test(url) ? 'specialist' : 'regular'
}

/**
 * Where a submission for this identity queues: a cardless registration (its serial reads "N/A") lands
 * in the specialist queue, a cardholder's in the regular one.
 *
 * @param {{ cardSerialNumber: string }} identity
 * @returns {ReviewQueue}
 */
function queueOfIdentity(identity) {
  return identity.cardSerialNumber.trim().toUpperCase() === 'N/A' ? 'specialist' : 'regular'
}

/**
 * Every claim button on the dashboard, in {@link REVIEW_QUEUE_ORDER}. The portal renders a DIFFERENT
 * form per queue — the regular queue's posts to `verifyIdentity`, the specialist queue's to
 * `reviewIdentity` — and only for queues that actually have work, so the endpoints are discovered
 * rather than assumed.
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
  return forms.sort((a, b) => REVIEW_QUEUE_ORDER.indexOf(a.queue) - REVIEW_QUEUE_ORDER.indexOf(b.queue))
}

/**
 * The claim button for one queue, or null while that queue is empty. Only that queue: the other one's
 * head is someone else's work by definition, and claiming it just to release it again would churn a
 * request a person is waiting on.
 *
 * @param {string} dashboardHtml
 * @param {ReviewQueue} queue
 * @returns {ClaimForm | null}
 */
function findClaimForm(dashboardHtml, queue) {
  return findClaimForms(dashboardHtml).find((form) => form.queue === queue) ?? null
}

/**
 * Echoes the rendered review form as a browser would submit it: every field sent back as the portal
 * filled it in, and each radio group answered by `answerGroup` — or left out when that returns
 * undefined, as an untouched radio group is.
 *
 * Which fields exist depends on what the person submitted — a cardholder with a photo card answers
 * three questions, while an added photo ID or a cardless registration brings its own document and
 * name fields, pre-filled with what the app sent. Echoing means those values come from the page
 * instead of from test config, which is what keeps one code path correct for every card type.
 *
 * @param {ReturnType<typeof load>} $ - the loaded review page
 * @param {(groupName: string) => string | undefined} answerGroup
 * @returns {URLSearchParams}
 */
function echoReviewForm($, answerGroup) {
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
      const answer = answerGroup(name)
      if (answer !== undefined) {
        body.append(name, answer)
      }
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

  return body
}

/**
 * The attestation a decision submits (`Continue`): every answer the affirmative one, bar the
 * suspicious-activity confidence that tells approve from reject.
 *
 * @param {ReturnType<typeof load>} $ - the loaded review page
 * @param {'0' | '2'} suspiciousActivityValue - '0' confident (approve), '2' not confident (reject)
 * @returns {string}
 */
function buildAttestationBody($, suspiciousActivityValue) {
  const body = echoReviewForm($, (name) =>
    name === SUSPICIOUS_ACTIVITY_FIELD ? suspiciousActivityValue : AFFIRMATIVE_ANSWER
  )
  body.append('command', 'Continue')
  return body.toString()
}

/**
 * The body for a command that decides nothing — `CloseRequest` (release the claim) or
 * `TransferToSpecialist` — as the browser sends it: the form's own fields and no attestation answers
 * (reference capture 2026-11-03), so nothing is attested on a request someone else will review.
 *
 * @param {ReturnType<typeof load>} $ - the loaded review page
 * @param {'CloseRequest' | 'TransferToSpecialist'} command
 * @returns {string}
 */
function buildReviewCommandBody($, command) {
  const body = echoReviewForm($, () => undefined)
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
    if (
      (candidate.lastName ?? '').toUpperCase() === wantedSurname &&
      (candidate.firstName ?? '').toUpperCase() === wantedFirstName
    ) {
      chosenId = candidateId
      // Candidates are named by position only: their names are the portal's identities, not ours to log.
      console.log(`  identity match: candidate ${index} of ${candidateIds.length}`)
      break
    }
  }

  if (!chosenId) {
    throw new Error(`[identity match] none of the ${candidateIds.length} candidates is the expected person`)
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
 * @property {string} [persona] - What logs call this identity (a persona key); the serial and name never reach a log line
 *
 * @typedef {Object} SendVideoRejectInput
 * @property {'reject'} decision
 * @property {string} cardSerialNumber
 * @property {string} surname
 * @property {string} firstName
 * @property {'ios' | 'android'} [platform]
 * @property {string} [persona]
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

/**
 * One line naming a claimed request, for logs and summaries — by persona label, never by the name or
 * serial on it: these lines reach remote logs.
 *
 * @param {ClaimedRequest} claimed
 * @param {string} persona
 */
function describeClaimed(claimed, persona) {
  return `${claimed.queue} ${claimed.requestIdentifier} (${persona}, ${claimed.claimedOs || 'os unknown'}, app ${claimed.claimedAppVersion || '?'}, video ${claimed.videoDate || '?'})`
}

/** What logs call the identity a caller expects: its persona label, or `expected` for an unlabelled CLI one. */
function expectedPersona(input) {
  return input.persona ?? 'expected'
}

/**
 * The label for a claimed request: the matching persona's, or `foreign` for anyone else's.
 *
 * @param {ClaimedRequest} claimed
 * @param {{ cardSerialNumber: string, surname: string, firstName: string, persona?: string }[]} personas
 */
function claimedPersona(claimed, personas) {
  const matched = personas.find((persona) => matchesExpectedIdentity(claimed, persona))
  return matched ? expectedPersona(matched) : 'foreign'
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
 * the other platform's run, a crashed run's leftovers, the UAT team — so the head can be anyone's.
 * Never review someone else's submission, and never reject it either: a stranger's at the head of the
 * regular queue is moved to the Specialist Review queue for a person to work (the one way past it
 * that keeps it), while any other foreign head — a stranger's in the specialist queue, where there is
 * nowhere left to move it, or this persona's own upload from the other platform, which is e2e work
 * the lane rules say never runs alongside — is released (`CloseRequest`) and the poll continues. The
 * same request coming back a third time means the release or the move is not sticking, and the loop
 * fails rather than churn the queue.
 *
 * Exported for the unit tests; {@link reviewSendVideoLogin} is the entry point.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {SendVideoReviewInput} input
 * @param {number} claimTimeoutMs
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ detailUrl: string, claimed: ClaimedRequest }>}
 */
export async function claimMatchingSendVideoRequest(fetchWithCookies, input, claimTimeoutMs, signal) {
  const claimDeadline = Date.now() + claimTimeoutMs
  const queue = queueOfIdentity(input)
  /** @type {Map<string, number>} how often each foreign request id has been claimed (and moved or released) */
  const foreignClaims = new Map()

  for (let attempt = 1; ; attempt++) {
    const dashboardHtml = await fetchBackcheckDashboard(fetchWithCookies, signal)

    // Rendered only for a queue with work, so its absence is the empty-queue signal. A fresh-login
    // role interstitial also lands here, hence the title.
    const claimForm = findClaimForm(dashboardHtml, queue)
    if (!claimForm) {
      console.log(
        `[idcheck] [~] claim attempt ${attempt}: no claim button for the ${queue} queue — page is "${extractPageTitle(dashboardHtml) || '(untitled)'}"`
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
      console.log(`[idcheck] [~] claim attempt ${attempt}: nothing queued yet (landed on ${landing})`)
      await waitForNextClaimAttemptOrThrow(claimDeadline, claimTimeoutMs, signal, () => landing)
      continue
    }

    if (matchesExpectedIdentity(claimed, input)) {
      await logStep('claim send-video request', claimResponse, claimHtml)
      console.log(`  claimed ${describeClaimed(claimed, expectedPersona(input))}`)
      return { detailUrl: claimResponse.url, claimed }
    }

    const timesClaimed = (foreignClaims.get(claimed.requestIdentifier) ?? 0) + 1
    foreignClaims.set(claimed.requestIdentifier, timesClaimed)
    if (timesClaimed >= 3) {
      // One last release before failing: the previous ones evidently did not stick, but bailing
      // while still holding the claim would leave the queue head ours and block the next run too.
      await releaseClaimedRequest(fetchWithCookies, claimed.$detail, claimResponse.url, signal)
      throw new Error(
        `[claim send-video request] foreign request ${claimed.requestIdentifier} keeps coming back to the ${claimed.queue} queue — ` +
          `claimed it ${timesClaimed} times while waiting for ${expectedPersona(input)}; check the SIT backcheck dashboard`
      )
    }

    const samePersonaOtherPlatform = matchesExpectedIdentity(claimed, { ...input, platform: undefined })
    if (claimed.queue === 'regular' && !samePersonaOtherPlatform) {
      console.log(
        `[idcheck] [~] claim attempt ${attempt}: claimed ${describeClaimed(claimed, 'foreign')} — moving it to the specialist queue and retrying`
      )
      await transferClaimedRequestToSpecialist(
        fetchWithCookies,
        claimed.$detail,
        claimResponse.url,
        DEFAULT_TRANSFER_COMMENT,
        signal
      )
      // The queue just changed under us, so there is nothing to wait for — but the deadline still
      // binds, or a regular queue that keeps refilling with strangers would keep the review moving them.
      throwIfClaimDeadlinePassed(
        claimDeadline,
        claimTimeoutMs,
        () => `moved foreign request ${claimed.requestIdentifier}`
      )
      continue
    }

    console.log(
      `[idcheck] [~] claim attempt ${attempt}: claimed ${describeClaimed(claimed, 'foreign')} — closing it and retrying`
    )
    await releaseClaimedRequest(fetchWithCookies, claimed.$detail, claimResponse.url, signal)
    await waitForNextClaimAttemptOrThrow(
      claimDeadline,
      claimTimeoutMs,
      signal,
      () => `closed foreign request ${claimed.requestIdentifier}`
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
  throw claimTimeoutError(claimTimeoutMs, describeLastPage)
}

/**
 * Throws once the claim deadline has passed — for a retry with nothing to wait for, which must still
 * end when the time is up.
 *
 * @param {number} claimDeadline
 * @param {number} claimTimeoutMs
 * @param {() => string} [describeLastPage]
 */
function throwIfClaimDeadlinePassed(claimDeadline, claimTimeoutMs, describeLastPage) {
  if (Date.now() >= claimDeadline) {
    throw claimTimeoutError(claimTimeoutMs, describeLastPage)
  }
}

/**
 * @param {number} claimTimeoutMs
 * @param {() => string} [describeLastPage]
 */
function claimTimeoutError(claimTimeoutMs, describeLastPage) {
  const suffix = describeLastPage ? ` — last: ${describeLastPage()}` : ''
  return new Error(`[claim send-video request] no matching submission within ${claimTimeoutMs}ms${suffix}`)
}

/**
 * Best-effort `CloseRequest` release of a claimed request. Never throws — the claim loop decides
 * what a release that did not stick means — but a non-OK response is worth a warning, since a
 * silently failed release is exactly how the same foreign request comes straight back, and the
 * caller is told, since the drain never claims from that queue again to notice.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {ReturnType<typeof load>} $detail
 * @param {string} detailUrl
 * @param {AbortSignal} [signal]
 * @returns {Promise<boolean>} whether the portal accepted the release
 */
async function releaseClaimedRequest(fetchWithCookies, $detail, detailUrl, signal) {
  try {
    const response = await fetchWithCookies(BACKCHECK_CONTINUE_URL, {
      headers: backcheckFormPostHeaders(detailUrl),
      body: buildReviewCommandBody($detail, 'CloseRequest'),
      method: 'POST',
      signal,
    })
    if (!response.ok) {
      console.warn(`[idcheck] [!] CloseRequest release returned ${response.status}`)
    }
    return response.ok
  } catch (err) {
    console.warn('[idcheck] [!] CloseRequest release failed:', err)
    return false
  }
}

/** The note a moved request carries into the specialist queue — the first thing its reviewer reads there. */
const DEFAULT_TRANSFER_COMMENT =
  'Moved here by the automated e2e queue cleanup: this request is not from an e2e test persona, so it was transferred instead of rejected. Please review it from this queue.'

/**
 * Moves a claimed request to the Specialist Review queue, as an agent's "Transfer Request to
 * Specialist" does: the command on the review form (no attestation — the specialist reviews it
 * fresh), then the note form it leads to, echoed with the comment. Each page title is asserted, so a
 * request is never left half-moved without the log naming the step that failed.
 *
 * Reference capture: idsit.gov.bc.ca, 2026-11-03.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {ReturnType<typeof load>} $detail
 * @param {string} detailUrl
 * @param {string} comment
 * @param {AbortSignal} [signal]
 */
async function transferClaimedRequestToSpecialist(fetchWithCookies, $detail, detailUrl, comment, signal) {
  const commandResponse = await fetchWithCookies(BACKCHECK_CONTINUE_URL, {
    headers: backcheckFormPostHeaders(detailUrl),
    body: buildReviewCommandBody($detail, 'TransferToSpecialist'),
    method: 'POST',
    signal,
  })
  const noteHtml = await logStep('transfer to specialist', commandResponse)
  assertPageTitle('transfer to specialist', noteHtml, TRANSFER_NOTE_TITLE)

  // The note form's action is set client-side from its data attribute; its hidden fields carry the
  // request and the target status (REVIEW), echoed as rendered.
  const $note = load(noteHtml)
  const form = $note('#transfer-form')
  if (form.length === 0) {
    throw new Error('[transfer note] no #transfer-form on the transfer page')
  }
  const actionPath = form.attr('data-action-path')
  if (!actionPath) {
    throw new Error('[transfer note] #transfer-form names no data-action-path')
  }
  const body = new URLSearchParams()
  form.find('input[type="hidden"]').each((_, element) => {
    const name = $note(element).attr('name')
    if (name) {
      body.append(name, $note(element).attr('value') ?? '')
    }
  })
  body.append('comment', comment)

  const transferResponse = await fetchWithCookies(`${BACKCHECK_BASE_URL}/${actionPath}`, {
    headers: backcheckFormPostHeaders(BACKCHECK_CONTINUE_URL),
    body: body.toString(),
    method: 'POST',
    signal,
  })
  const doneHtml = await logStep('transfer note', transferResponse)
  assertPageTitle('transfer note', doneHtml, TRANSFER_DONE_TITLE)
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
    body: buildAttestationBody($detail, suspiciousActivityValue),
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
 * Reviews (approves or rejects) a queued send-video verification request in the IDCheck portal.
 *
 * The portal has no queue listing — its claim button takes the next submission FIFO — so the claim is
 * polled until it lands on the expected person, moving anyone else's submission aside along the way
 * (see {@link claimMatchingSendVideoRequest}). Which claim button exists depends on the queue holding the
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

  const fetchWithCookies = await openSession(signal)
  const { detailUrl, claimed } = await claimMatchingSendVideoRequest(fetchWithCookies, input, claimTimeoutMs, signal)
  const { requestIdentifier, csrfToken, $detail } = claimed

  await submitSendVideoDecision(fetchWithCookies, $detail, detailUrl, requestIdentifier, csrfToken, input, signal)

  return summarizeClaimed(claimed, expectedPersona(input))
}

/**
 * @typedef {Object} ClaimedRequestSummary
 * @property {string} requestIdentifier
 * @property {ReviewQueue} queue
 * @property {string} persona - Whose request it was, as a log may say it: a persona label, or `foreign`
 * @property {string} claimedName
 * @property {string} claimedSerial
 * @property {string} claimedOs
 * @property {string} claimedAppVersion
 * @property {string} videoDate
 *
 * @typedef {Object} DrainSendVideoQueueResult
 * @property {ClaimedRequestSummary[]} rejected - The e2e personas' requests (every request, under scope `all`)
 * @property {ClaimedRequestSummary[]} transferred - Anyone else's, moved from the regular queue to the specialist queue
 * @property {ClaimedRequestSummary[]} released - Anyone else's at the head of the specialist queue, released and left there
 * @property {ReviewQueue[]} queuesWithWork - Queues still showing a claim button when the drain ended
 * @property {string} [stoppedReason] - Why the drain stopped before the dashboard ran dry
 */

/** @param {ClaimedRequest} claimed @param {string} persona @returns {ClaimedRequestSummary} */
function summarizeClaimed(claimed, persona) {
  const { requestIdentifier, queue, claimedName, claimedSerial, claimedOs, claimedAppVersion, videoDate } = claimed
  return { requestIdentifier, queue, persona, claimedName, claimedSerial, claimedOs, claimedAppVersion, videoDate }
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
    throw new Error(`[queue drain] unknown scope "${scope}" (e2e | all)`)
  }
  if (scope === 'e2e' && personas.length === 0) {
    throw new Error("[queue drain] scope 'e2e' needs the personas to keep to")
  }
}

/**
 * @typedef {Object} DrainOptions
 * @property {'e2e' | 'all'} scope
 * @property {{ cardSerialNumber: string, surname: string, firstName: string, persona?: string }[]} personas
 * @property {string} reason - What the portal records against each rejected request
 * @property {string} transferComment - The note each moved request carries into the specialist queue
 * @property {number} maxClaims
 * @property {boolean} dryRun
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {'rejected' | 'transferred' | 'released'} DrainAction - What the drain did with a claimed request
 */

/**
 * Whether a request this run already handled is back somewhere it should not be. One moved to the
 * specialist queue is expected at that queue's head; anything else coming back — a decision or a move
 * that did not stick — is a reason to stop churning the queue.
 *
 * @param {DrainAction | undefined} before - What this run did with the request, if anything
 * @param {ReviewQueue} queue - The queue it was just claimed from
 */
function cameBackUnexpectedly(before, queue) {
  return before !== undefined && !(before === 'transferred' && queue === 'specialist')
}

/**
 * Does with a claimed request the one thing {@link drainReviewQueues} does with it — reject it, move it
 * to the specialist queue, or release it — and says which.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {ClaimedRequest} claimed
 * @param {string} detailUrl - The claimed request's page, which the portal's forms post from
 * @param {string} persona - The claimed request's persona label, or `foreign`
 * @param {DrainOptions} options
 * @returns {Promise<DrainAction>}
 */
async function settleClaimedRequest(fetchWithCookies, claimed, detailUrl, persona, options) {
  const { scope, reason, transferComment, signal } = options
  if (scope === 'e2e' && persona === 'foreign') {
    if (claimed.queue === 'regular') {
      await transferClaimedRequestToSpecialist(fetchWithCookies, claimed.$detail, detailUrl, transferComment, signal)
      console.log(`[queue drain] moved ${describeClaimed(claimed, persona)} to the specialist queue`)
      return 'transferred'
    }
    const released = await releaseClaimedRequest(fetchWithCookies, claimed.$detail, detailUrl, signal)
    if (!released) {
      // The drain leaves this queue alone from here on, so nothing later would notice a release that
      // did not go through — unlike the review, which sees the request come back. Say so now.
      throw new Error(
        `[queue drain] the portal did not accept the release of ${claimed.requestIdentifier} — it may still be claimed by the e2e account, with the ${claimed.queue} queue blocked behind it`
      )
    }
    console.log(
      `[queue drain] released ${describeClaimed(claimed, persona)} — leaving the ${claimed.queue} queue alone`
    )
    return 'released'
  }

  await submitSendVideoDecision(
    fetchWithCookies,
    claimed.$detail,
    detailUrl,
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
  console.log(`[queue drain] rejected ${describeClaimed(claimed, persona)}`)
  return 'rejected'
}

/**
 * Empty the review queues of the e2e personas' requests: claim the head, decide what it is, repeat
 * until no queue has a head this run may claim. The journeys run it before they submit (so their own
 * upload is the head the review claims) and after a failure (so an orphan never waits for the
 * morning); the nightly runs it once more at the end.
 *
 * An e2e persona's request is rejected — a terminal, logged decision, while `CloseRequest` only
 * releases the claim. Anyone else's is never rejected (scope `e2e`, the default): at the head of the
 * regular queue it is moved to the Specialist Review queue, where a person reviews it and where it no
 * longer stands in front of the journeys' uploads; at the head of the specialist queue there is
 * nowhere left to move it, so it is released and that queue left alone — FIFO means nothing behind
 * it is reachable without touching it. Scope `all` rejects everything queued, and is for a
 * deliberate manual cleanup only.
 *
 * `dryRun` only reads the dashboard — which queues hold work — claiming nothing.
 *
 * Exported for the unit tests; {@link drainSendVideoQueue} is the entry point.
 *
 * @param {typeof fetch} fetchWithCookies
 * @param {DrainOptions} options
 * @returns {Promise<DrainSendVideoQueueResult>}
 */
export async function drainReviewQueues(fetchWithCookies, options) {
  const { personas, maxClaims, dryRun, signal } = options
  /** @type {DrainSendVideoQueueResult} */
  const result = { rejected: [], transferred: [], released: [], queuesWithWork: [] }
  /** @type {Map<string, DrainAction>} what this run already did to each request id */
  const handled = new Map()

  for (let claims = 0; ; claims++) {
    const dashboardHtml = await fetchBackcheckDashboard(fetchWithCookies, signal)
    const claimForms = findClaimForms(dashboardHtml)
    result.queuesWithWork = claimForms.map((form) => form.queue)
    if (claimForms.length === 0) {
      console.log(`[queue drain] queues empty after ${claims} claim(s)`)
      return result
    }
    // A queue whose head this run released is left as it is: FIFO means nothing behind that head is reachable.
    const claimForm = claimForms.find((form) => !result.released.some((released) => released.queue === form.queue))
    if (!claimForm) {
      result.stoppedReason = `a request that is not an e2e persona heads the ${result.queuesWithWork.join(' and ')} queue — left for a person to review`
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
      // The queue emptied between the dashboard read and the claim: report what is queued NOW.
      result.queuesWithWork = findClaimForms(await fetchBackcheckDashboard(fetchWithCookies, signal)).map(
        (form) => form.queue
      )
      return result
    }

    const persona = claimedPersona(claimed, personas)
    const before = handled.get(claimed.requestIdentifier)
    if (cameBackUnexpectedly(before, claimed.queue)) {
      await releaseClaimedRequest(fetchWithCookies, claimed.$detail, claimResponse.url, signal)
      result.stoppedReason = `${claimed.requestIdentifier} (${persona}) came back to the ${claimed.queue} queue after being ${before}`
      return result
    }

    const action = await settleClaimedRequest(fetchWithCookies, claimed, claimResponse.url, persona, options)
    handled.set(claimed.requestIdentifier, action)
    result[action].push(summarizeClaimed(claimed, persona))
  }
}

/**
 * Signs in and runs {@link drainReviewQueues}.
 *
 * @param {{ scope?: 'e2e' | 'all', personas?: { cardSerialNumber: string, surname: string, firstName: string, persona?: string }[], reason?: string, transferComment?: string, maxClaims?: number, dryRun?: boolean, signal?: AbortSignal }} [options]
 * @returns {Promise<DrainSendVideoQueueResult>}
 */
export async function drainSendVideoQueue(options = {}) {
  const {
    scope = 'e2e',
    personas = [],
    reason = DEFAULT_DRAIN_REASON,
    transferComment = DEFAULT_TRANSFER_COMMENT,
    maxClaims = DEFAULT_DRAIN_MAX_CLAIMS,
    dryRun = false,
    signal,
  } = options
  assertValidDrainScope(scope, personas)

  const fetchWithCookies = await openSession(signal)
  return drainReviewQueues(fetchWithCookies, { scope, personas, reason, transferComment, maxClaims, dryRun, signal })
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
  console.error('  node login.mjs check     (sign in and read the portal home — credential and connectivity check)')
  console.error('  node login.mjs photo     <serial> <birthdate(YYYY-MM-DD)> <code>')
  console.error('  node login.mjs non-photo <serial> <birthdate(YYYY-MM-DD)> <code> <docTypeId>:<docNum>')
  console.error('  node login.mjs non-bcsc  <code> <docTypeId>:<docNum> <docTypeId>:<docNum>')
  console.error('  node login.mjs send-video approve <serial> <surname> <firstName>')
  console.error('  node login.mjs send-video reject  <serial> <surname> <firstName> [reasonId] [message]')
  console.error('     (serial is "N/A" for a cardless registration; the name is what identifies it)')
  console.error('  Draining the review queue: yarn queue:drain [--scope e2e|all] (scripts/send-video-queue.ts)')
}

if (isRunAsCli()) {
  // CLI-only: load .env.e2e so the standalone invocation has the IDCHECK_*
  // credentials. When this module is dynamic-imported by wdio tests,
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
    if (flow === 'check') {
      // nothing to parse: the sign-in is the whole job
    } else if (flow === 'photo') {
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

  if (flow === 'check') {
    const result = await checkIdcheckSignIn()
    console.log(
      `[idcheck] signed in as ${result.user} (${result.method} MFA) — landed on ${result.landingUrl} "${result.landingTitle}"`
    )
  } else if (sendVideoInput) {
    const claimed = await reviewSendVideoLogin(sendVideoInput)
    console.log(`[idcheck] reviewed ${claimed.queue} request ${claimed.requestIdentifier} (${claimed.persona})`)
  } else {
    await approveInPersonLogin(input)
  }
}

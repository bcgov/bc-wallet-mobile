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
  const pathname = new URL(response.url).pathname
  const icon = response.ok ? '+' : '!'
  console.log(`[sm-login] [${icon}] ${step}: ${response.status} ${pathname}`)

  if (!response.ok) {
    const errorDetail = extractErrorMessage(body)
    throw new Error(`[${step}] HTTP ${response.status} ${pathname}\n${errorDetail}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('json')) {
    try {
      const parsed = JSON.parse(body)
      console.log(`  body: ${JSON.stringify(parsed).slice(0, 300)}`)
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

  dotenv.config({ path: path.join(SCRIPT_DIR, '..', 'local.env') })

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
    throw new Error('Missing SM_USER or SM_PASSWORD in local.env')
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
}

if (isRunAsCli()) {
  const [flow, ...rest] = process.argv.slice(2)

  /** @type {ApproveInPersonInput | null} */
  let input = null

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
    } else {
      throw new Error(`Unknown or missing flow: "${flow ?? ''}"`)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    printUsage()
    process.exit(1)
  }

  await approveInPersonLogin(input)
}
